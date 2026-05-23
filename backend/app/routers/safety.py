import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db
from ..models.trip import SafetyAlert, Trip
from ..schemas.safety import SafetyAlertOut
from ..clients.disaster_client import DisasterClient
from ..clients.google_maps_client import GoogleMapsClient, Coordinate
from ..clients.weather_client import WeatherClient

router = APIRouter()

DEFAULT_ALERTS = [
    ("warning", "오후 소나기 가능", "오늘 16:00 이후 강수 확률이 올라갑니다.", "실내 전시와 카페를 대체 일정으로 준비", "오늘 09:20"),
    ("info", "행사로 인한 혼잡", "북촌 주요 골목에 단체 방문객이 예상됩니다.", "전망 산책로를 30분 앞당기기", "오늘 10:05"),
    ("danger", "강풍 예비 알림", "내일 한강 인근 야외 활동은 체감 위험이 있습니다.", "실내 공방 체험으로 자동 조정 제안", "어제 22:40"),
]


@router.get("/{trip_id}/safety", response_model=dict)
async def get_safety_alerts(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SafetyAlert).where(SafetyAlert.trip_id == trip_id)
    )
    alerts = list(result.scalars().all())

    if not alerts:
        trip = await db.get(Trip, trip_id)
        if trip:
            generated = await _generate_contextual_alerts(trip)
            if not generated:
                generated = DEFAULT_ALERTS
            for level, title, message, action, time in generated:
                alert = SafetyAlert(
                    id=str(uuid.uuid4()), trip_id=trip_id,
                    level=level, title=title, message=message, action=action, time=time,
                )
                db.add(alert)
                alerts.append(alert)
            await db.commit()

    data = [
        SafetyAlertOut(
            id=a.id, level=a.level, title=a.title,
            message=a.message, action=a.action, time=a.time,
        ).model_dump(by_alias=True)
        for a in alerts
    ]
    return {"data": data, "error": None}


async def _generate_contextual_alerts(trip: Trip) -> list[tuple[str, str, str, str, str]]:
    prefs = trip.preferences_json or {}
    region = str(prefs.get("region") or prefs.get("baseRegion") or "서울특별시")
    start = _parse_date(prefs.get("dateFrom")) or date.today()
    end = _parse_date(prefs.get("dateTo")) or start
    if end < start:
        end = start
    if (end - start).days > 6:
        end = start + timedelta(days=6)

    google = GoogleMapsClient()
    coord = await google.search_coordinate(region) or Coordinate(lat=37.5665, lng=126.9780)

    weather = WeatherClient()
    forecasts = await weather.get_range_forecast(start, end, coord.lat, coord.lng)

    disaster = DisasterClient()
    disaster_alerts = await disaster.get_alerts(region, start, end)

    rows: list[tuple[str, str, str, str, str]] = []
    for forecast in forecasts:
        day_label = forecast.target_date.strftime("%m/%d")
        if forecast.is_bad_weather:
            rows.append((
                "warning" if forecast.condition != "storm" else "danger",
                f"{day_label} 날씨 주의",
                forecast.description,
                "야외 코스를 줄이고 실내 관광지 또는 카페/전시 후보를 우선 배치하세요.",
                f"{day_label} 06:00",
            ))
        elif forecast.is_high_uv:
            rows.append((
                "info",
                f"{day_label} 자외선 주의",
                f"자외선 지수 {forecast.uv_index} 수준입니다.",
                "정오 전후 야외 체류 시간을 줄이고 휴식 시간을 중간에 배치하세요.",
                f"{day_label} 06:00",
            ))

    for alert in disaster_alerts[:5]:
        rows.append((
            alert.level,
            alert.title,
            alert.message,
            "영향 받는 야외 일정을 실내 대체 코스로 조정하세요." if alert.affects_outdoor() else "현장 안내를 확인하고 이동 시간을 여유 있게 잡으세요.",
            alert.issued_at.strftime("%m/%d %H:%M"),
        ))

    return rows[:8]


def _parse_date(value: object) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
