"""행정안전부 재난문자 / 안전디딤돌 API 클라이언트.

──────────────────────────────────────
역할
──────────────────────────────────────
여행 지역에서 발생한 재난/안전 알림을 가져옵니다:
- 강풍, 호우, 폭설, 한파, 폭염 같은 기상 특보
- 미세먼지 농도 주의보
- 지진, 산불 등 위험 상황

──────────────────────────────────────
레벨 매핑
──────────────────────────────────────
- emergency_alert (위급재난문자): danger
- urgent_alert    (긴급재난문자): warning
- general_alert   (안전안내문자): info
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal

import httpx

from ..config import settings


DisasterLevel = Literal["info", "warning", "danger"]


@dataclass
class DisasterAlert:
    """재난/안전 알림 한 건."""
    alert_id: str
    level: DisasterLevel
    title: str
    message: str
    region: str
    issued_at: datetime

    def affects_outdoor(self) -> bool:
        """야외 활동에 영향을 주는 종류인지 휴리스틱 판단."""
        outdoor_keywords = (
            "강풍", "호우", "폭우", "폭설", "한파", "폭염",
            "황사", "미세먼지", "태풍", "지진", "산사태",
        )
        return any(kw in self.title or kw in self.message for kw in outdoor_keywords)


MOIS_URL = "https://www.safetydata.go.kr/V2/api/DSSP-IF-00247"


class DisasterClient:
    """행안부 재난문자 API 클라이언트."""

    def __init__(self) -> None:
        self.api_key: str = getattr(settings, "mois_api_key", "") or ""
        self.enabled: bool = bool(self.api_key)

    async def get_alerts(
        self, region: str, start_date: date, end_date: date
    ) -> list[DisasterAlert]:
        """특정 지역+기간의 재난 알림 목록.

        Args:
            region: 시도 단위 (예: "서울특별시", "부산광역시")
        """
        if not self.enabled:
            return _mock_alerts(region, start_date, end_date)

        params = {
            "serviceKey": self.api_key,
            "pageNo": 1,
            "numOfRows": 100,
            "crtDt": start_date.strftime("%Y%m%d"),
            "rgnNm": region,
            "returnType": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(MOIS_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            return _mock_alerts(region, start_date, end_date)

        return _parse_mois_response(data, start_date, end_date)


def _parse_mois_response(
    data: dict, start_date: date, end_date: date
) -> list[DisasterAlert]:
    """행안부 응답 -> DisasterAlert 변환."""
    items = data.get("body", []) or []
    alerts: list[DisasterAlert] = []
    for item in items:
        try:
            issued = datetime.strptime(
                item.get("crtDt", ""), "%Y/%m/%d %H:%M:%S"
            )
        except ValueError:
            continue

        if not (start_date <= issued.date() <= end_date):
            continue

        title = item.get("emrgStepNm", item.get("dsstrSeNm", "재난 알림"))
        message = item.get("msgCn", "")
        region = item.get("rcptnRgnNm", "")
        level = _classify_level(item.get("emrgStepNm", ""))

        alerts.append(
            DisasterAlert(
                alert_id=str(item.get("sn", "")),
                level=level,
                title=title,
                message=message,
                region=region,
                issued_at=issued,
            )
        )
    return alerts


def _classify_level(step_name: str) -> DisasterLevel:
    if "위급" in step_name:
        return "danger"
    if "긴급" in step_name:
        return "warning"
    return "info"


def _mock_alerts(
    region: str, start_date: date, end_date: date
) -> list[DisasterAlert]:
    """데모용 가짜 알림. 30% 확률로 1~2개 생성."""
    seed = (hash(region) + start_date.toordinal()) % 100
    if seed < 70:
        return []

    alerts = [
        DisasterAlert(
            alert_id=f"mock-{seed}-1",
            level="warning",
            title="강풍 예비 특보",
            message=f"{start_date} 야간부터 {region} 인근에 초속 14m 이상의 강풍이 예상됩니다.",
            region=region,
            issued_at=datetime.combine(start_date, datetime.min.time()).replace(hour=22),
        ),
    ]
    if seed > 90:
        alerts.append(
            DisasterAlert(
                alert_id=f"mock-{seed}-2",
                level="info",
                title="미세먼지 농도 주의",
                message=f"{region} 미세먼지 농도가 '나쁨' 수준입니다. 야외 활동 시 마스크를 권장합니다.",
                region=region,
                issued_at=datetime.combine(start_date, datetime.min.time()).replace(hour=8),
            )
        )
    return alerts
