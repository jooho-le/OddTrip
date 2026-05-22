"""LLM 후처리: 각 슬롯에 자연스러운 aiReason 생성.

──────────────────────────────────────
핵심 설계
──────────────────────────────────────
- 전체 일정을 한 번에 GPT-4o-mini에 보내 batch 처리 (1 trip = 1 API call)
- 알고리즘이 정한 사실(시각, 이동시간, 장소)은 LLM이 변경 불가능
- LLM이 채우는 것: aiReason, day title 다듬기

비용: 1 trip 생성당 약 $0.001 (1원 미만)
"""
from __future__ import annotations

import json

from openai import AsyncOpenAI

from ..config import settings
from .models import PlannedDay, PlannedSlot


class LLMNarrator:
    """일정 슬롯에 자연스러운 설명을 채워주는 컴포넌트."""

    def __init__(self) -> None:
        self.api_key = settings.openai_api_key or ""
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    async def narrate(
        self, days: list[PlannedDay], traveler_context: str = ""
    ) -> list[PlannedDay]:
        """각 day의 슬롯에 aiReason과 description을 채움."""
        if not self.client:
            return _fallback_narrate(days)

        try:
            return await self._llm_narrate(days, traveler_context)
        except Exception:
            return _fallback_narrate(days)

    async def _llm_narrate(
        self, days: list[PlannedDay], traveler_context: str
    ) -> list[PlannedDay]:
        """GPT 한 번 호출로 모든 슬롯의 aiReason 생성."""
        payload = _build_payload(days, traveler_context)

        system_prompt = (
            "You are OddTrip's travel storyteller. "
            "Given a pre-computed itinerary, you fill in 'aiReason' for each slot "
            "and a polished 'title' for each day. "
            "RULES (strict): "
            "1) DO NOT change times, durations, places, or order — only add explanatory text. "
            "2) Each aiReason must be 25~50 Korean characters, polite, second-person tone. "
            "3) Return JSON only matching the input schema. "
            "4) Reference the traveler's TTI when explaining why."
        )

        user_prompt = (
            f"여행자 정보: {traveler_context or '일반'}\n\n"
            f"입력 일정 (JSON):\n{json.dumps(payload, ensure_ascii=False)}\n\n"
            "각 slot에 aiReason (25~50자) 을 추가하고, 각 day에 더 매력적인 title을 제안해주세요. "
            "응답 형식:\n"
            "{ \"days\": [ { \"day_number\": 1, \"title\": \"...\", "
            "\"slots\": [ {\"id\": \"d1s1\", \"ai_reason\": \"...\"} ] } ] }"
        )

        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=45,
        )

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return _apply_narration(days, data)


def _build_payload(
    days: list[PlannedDay], traveler_context: str
) -> dict:
    """LLM에게 보낼 페이로드 - 사실만 포함, aiReason은 제외."""
    days_data = []
    for day in days:
        slots_data = []
        for idx, slot in enumerate(day.slots):
            slot_id = f"d{day.day_number}s{idx + 1}"
            slots_data.append({
                "id": slot_id,
                "type": slot.slot_type,
                "title": slot.title,
                "start": f"{slot.start_time.hour:02d}:{slot.start_time.minute:02d}",
                "duration_min": slot.duration_minutes,
                "location": slot.location,
            })
        days_data.append({
            "day_number": day.day_number,
            "date": day.target_date.isoformat(),
            "weather": day.weather.description,
            "caution": day.caution,
            "slots": slots_data,
        })
    return {"days": days_data, "traveler": traveler_context}


def _apply_narration(
    days: list[PlannedDay], llm_response: dict
) -> list[PlannedDay]:
    """LLM 응답을 원본 days에 머지 (mutation)."""
    response_days = {d.get("day_number"): d for d in llm_response.get("days", [])}

    for day in days:
        response_day = response_days.get(day.day_number)
        if not response_day:
            continue

        new_title = response_day.get("title")
        if isinstance(new_title, str) and new_title.strip():
            day.title = new_title.strip()

        response_slots = {s.get("id"): s for s in response_day.get("slots", [])}
        for idx, slot in enumerate(day.slots):
            slot_id = f"d{day.day_number}s{idx + 1}"
            response_slot = response_slots.get(slot_id)
            if not response_slot:
                continue
            reason = response_slot.get("ai_reason", "")
            if isinstance(reason, str) and reason.strip():
                slot.ai_reason = reason.strip()

    return days


# ══════════════════════════════════════════════════════
# Fallback: 템플릿 기반 aiReason
# ══════════════════════════════════════════════════════
_REASON_TEMPLATES = {
    "place": {
        "indoor_rain": "비 예보 시간대라 실내 일정으로 안정성을 확보합니다.",
        "active": "활동성 있는 일정으로 동행자의 에너지 수준을 맞춥니다.",
        "famous": "대표 명소를 한 번에 정리해 동선을 효율화합니다.",
        "default": "두 여행자의 취향 중간값에 맞춰 배치했습니다.",
    },
    "meal": {
        "lunch": "이동 중간에 식사를 넣어 피로 누적을 방지합니다.",
        "dinner": "하루의 마무리를 여유롭게 갖기 위해 배치합니다.",
    },
    "move": {
        "default": "Google 길찾기 기준 최단 경로로 동선을 줄였습니다.",
    },
    "rest": {
        "default": "체력 관리를 위해 의도적으로 휴식 구간을 두었습니다.",
    },
}


def _fallback_narrate(days: list[PlannedDay]) -> list[PlannedDay]:
    """LLM 사용 불가 시 템플릿으로 채우기."""
    for day in days:
        for slot in day.slots:
            slot.ai_reason = _template_for_slot(slot, day)
    return days


def _template_for_slot(slot: PlannedSlot, day: PlannedDay) -> str:
    """슬롯 종류와 맥락에 맞는 템플릿 선택."""
    templates = _REASON_TEMPLATES.get(slot.slot_type, {})

    if slot.slot_type == "place" and slot.place_ref:
        if day.weather.is_bad_weather and slot.place_ref.info.indoor:
            return templates.get("indoor_rain", templates.get("default", ""))
        if slot.place_ref.active:
            return templates.get("active", templates.get("default", ""))
        if slot.place_ref.famous:
            return templates.get("famous", templates.get("default", ""))
        return templates.get("default", "")

    if slot.slot_type == "meal":
        if "점심" in slot.title:
            return templates.get("lunch", "")
        return templates.get("dinner", "")

    return templates.get("default", "")
