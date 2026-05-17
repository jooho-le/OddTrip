from fastapi import APIRouter, Depends, HTTPException
from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..services import itinerary_service

router = APIRouter()


@router.get("/{trip_id}/itinerary", response_model=dict)
async def get_itinerary(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    data = await itinerary_service.get_itinerary(db, trip_id)
    return {"data": [d.model_dump(by_alias=True) for d in data], "error": None}


@router.post("/{trip_id}/itinerary/generate", response_model=dict)
async def generate_itinerary(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await itinerary_service.generate_itinerary(db, trip_id)
        return {"data": [d.model_dump(by_alias=True) for d in data], "error": None}
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.")
