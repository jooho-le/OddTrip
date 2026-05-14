import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_db
from ..models.trip import SafetyAlert, Trip
from ..schemas.safety import SafetyAlertOut

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

    # Auto-seed if trip exists but has no alerts yet
    if not alerts:
        trip = await db.get(Trip, trip_id)
        if trip:
            for level, title, message, action, time in DEFAULT_ALERTS:
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
