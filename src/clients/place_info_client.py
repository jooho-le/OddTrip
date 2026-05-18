"""장소 운영시간 / 휴무일 정보 클라이언트.

──────────────────────────────────────
LLM 기반 추론을 쓰는 이유
──────────────────────────────────────
무료 공공 API에서는 운영시간 데이터가 불완전해서, GPT-4o-mini에게 장소명을
주고 추론시킵니다. 유명 장소는 학습 데이터에 들어있어 비교적 정확합니다.

──────────────────────────────────────
Fallback
──────────────────────────────────────
LLM 호출 실패 시 카테고리 기반 표준값:
- "카페" → 10:00~22:00, 70분 체류
- "박물관" → 월요일 휴관, 10:00~18:00, 120분 체류
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import time
from typing import Optional

from openai import AsyncOpenAI

from ..config import settings


@dataclass
class PlaceInfo:
    """장소 운영 정보.

    opening_hours: 7개 원소 리스트, 인덱스 0=월요일, 6=일요일.
                  각 원소는 (open, close) 튜플 또는 None(휴무).
    """
    opening_hours: list[Optional[tuple[time, time]]] = field(
        default_factory=lambda: [None] * 7
    )
    avg_stay_minutes: int = 90
    indoor: bool = False

    def is_open_at(self, weekday: int, check_time: time) -> bool:
        hours = self.opening_hours[weekday]
        if hours is None:
            return False
        open_t, close_t = hours
        return open_t <= check_time <= close_t

    def is_closed_on(self, weekday: int) -> bool:
        return self.opening_hours[weekday] is None


class PlaceInfoClient:
    """장소 운영 정보 조회 클라이언트."""

    def __init__(self) -> None:
        self.api_key: str = settings.openai_api_key or ""
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    async def get_info(self, name: str, category: str) -> PlaceInfo:
        """장소명과 카테고리로 운영 정보 추론."""
        if not self.client:
            return _fallback_info(category)

        try:
            return await self._llm_query(name, category)
        except Exception:
            return _fallback_info(category)

    async def _llm_query(self, name: str, category: str) -> PlaceInfo:
        """GPT-4o-mini에게 JSON 형식으로 운영시간 질의."""
        system_prompt = (
            "You are a Korean tourism information assistant. "
            "Return JSON only — no prose. "
            "Field 'opening_hours' is an array of 7 entries, index 0 is Monday. "
            "Each entry is {'open': 'HH:MM', 'close': 'HH:MM'} or null if closed. "
            "Be conservative — if uncertain, return null for closed_days."
        )

        user_prompt = f"""장소: {name}
카테고리: {category}

이 장소의 운영시간을 JSON으로 답해주세요. 형식:
{{
  "opening_hours": [
    {{"open": "09:00", "close": "18:00"}},
    null,
    {{"open": "09:00", "close": "18:00"}},
    ...
  ],
  "avg_stay_minutes": 90,
  "indoor": true
}}
"""

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=20,
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return _parse_place_info(data, category)


def _parse_place_info(data: dict, category: str) -> PlaceInfo:
    """LLM 응답 -> PlaceInfo 변환. 형식이 깨지면 fallback."""
    raw_hours = data.get("opening_hours", [])
    if not isinstance(raw_hours, list) or len(raw_hours) != 7:
        return _fallback_info(category)

    parsed: list[Optional[tuple[time, time]]] = []
    for entry in raw_hours:
        if entry is None:
            parsed.append(None)
            continue
        try:
            open_t = _parse_time(entry["open"])
            close_t = _parse_time(entry["close"])
            parsed.append((open_t, close_t))
        except (KeyError, ValueError, TypeError):
            parsed.append(None)

    return PlaceInfo(
        opening_hours=parsed,
        avg_stay_minutes=int(data.get("avg_stay_minutes", 90)),
        indoor=bool(data.get("indoor", _category_indoor_default(category))),
    )


def _parse_time(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def _category_indoor_default(category: str) -> bool:
    indoor_keywords = ("카페", "박물관", "전시", "공방", "쇼핑", "식당", "맛집")
    outdoor_keywords = ("산", "공원", "해변", "산책", "전망", "광장")
    if any(k in category for k in indoor_keywords):
        return True
    if any(k in category for k in outdoor_keywords):
        return False
    return False


# ══════════════════════════════════════════════════════
# Fallback: 카테고리 기반 표준 운영시간
# ══════════════════════════════════════════════════════
_CATEGORY_DEFAULTS: dict[str, PlaceInfo] = {
    "카페": PlaceInfo(
        opening_hours=[(time(10, 0), time(22, 0))] * 7,
        avg_stay_minutes=70,
        indoor=True,
    ),
    "박물관": PlaceInfo(
        opening_hours=[None] + [(time(10, 0), time(18, 0))] * 6,  # 월요일 휴관
        avg_stay_minutes=120,
        indoor=True,
    ),
    "전시": PlaceInfo(
        opening_hours=[None] + [(time(10, 0), time(18, 0))] * 6,
        avg_stay_minutes=100,
        indoor=True,
    ),
    "공방": PlaceInfo(
        opening_hours=[(time(10, 0), time(20, 0))] * 7,
        avg_stay_minutes=120,
        indoor=True,
    ),
    "체험": PlaceInfo(
        opening_hours=[(time(10, 0), time(18, 0))] * 7,
        avg_stay_minutes=120,
        indoor=True,
    ),
    "산책": PlaceInfo(
        opening_hours=[(time(6, 0), time(22, 0))] * 7,
        avg_stay_minutes=80,
        indoor=False,
    ),
    "공원": PlaceInfo(
        opening_hours=[(time(6, 0), time(22, 0))] * 7,
        avg_stay_minutes=90,
        indoor=False,
    ),
    "시장": PlaceInfo(
        opening_hours=[(time(9, 0), time(22, 0))] * 7,
        avg_stay_minutes=90,
        indoor=False,
    ),
    "식당": PlaceInfo(
        opening_hours=[(time(11, 0), time(21, 0))] * 7,
        avg_stay_minutes=60,
        indoor=True,
    ),
    "축제": PlaceInfo(
        opening_hours=[(time(11, 0), time(22, 0))] * 7,
        avg_stay_minutes=120,
        indoor=False,
    ),
    "숙소": PlaceInfo(
        # 숙소는 항상 운영 (24시간)
        opening_hours=[(time(0, 0), time(23, 59))] * 7,
        avg_stay_minutes=30,  # 체크인/체크아웃 단순 방문 시간
        indoor=True,
    ),
}


def _fallback_info(category: str) -> PlaceInfo:
    """카테고리 부분 매칭 -> 표준값. 없으면 기본 (10-18시, 90분 체류)."""
    for key, info in _CATEGORY_DEFAULTS.items():
        if key in category:
            return info
    return PlaceInfo(
        opening_hours=[(time(10, 0), time(18, 0))] * 7,
        avg_stay_minutes=90,
        indoor=_category_indoor_default(category),
    )
