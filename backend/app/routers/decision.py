from fastapi import APIRouter, Depends, HTTPException
from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user_trip, get_db
from ..models.trip import Trip
from ..schemas.decision import ConflictRequest, JointPreferenceIn
from ..services import decision_service

router = APIRouter()


@router.get("/{trip_id}/preferences", response_model=dict)
async def get_preferences(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    prefs = await decision_service.get_preferences(db, trip.id)
    return {"data": prefs.model_dump(by_alias=True), "error": None}


@router.put("/{trip_id}/preferences", response_model=dict)
async def update_preferences(
    trip_id: str,
    body: JointPreferenceIn,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    prefs = await decision_service.update_preferences(
        db, trip.id, body.model_dump(by_alias=True)
    )
    return {"data": prefs.model_dump(by_alias=True), "error": None}


@router.post("/{trip_id}/resolve-conflict", response_model=dict)
async def resolve_conflict(
    trip_id: str,
    body: ConflictRequest,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    try:
        suggestion = await decision_service.resolve_conflict(db, trip.id, body.conflicts)
        return {"data": {"suggestion": suggestion}, "error": None}
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.")
