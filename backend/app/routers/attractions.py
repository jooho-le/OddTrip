from fastapi import APIRouter, Depends, HTTPException
from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user_trip, get_db
from ..models.trip import Trip
from ..schemas.attraction import AttractionToggle, PublicAttractionGenerateRequest
from ..services import attraction_service

router = APIRouter()


@router.get("/{trip_id}/attractions", response_model=dict)
async def get_attractions(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    data = await attraction_service.get_attractions(db, trip.id)
    return {"data": [a.model_dump(by_alias=True) for a in data], "error": None}


@router.post("/{trip_id}/attractions/generate", response_model=dict)
async def generate_attractions(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await attraction_service.generate_attractions(db, trip.id)
        return {"data": [a.model_dump(by_alias=True) for a in data], "error": None}
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.")


@router.post("/{trip_id}/attractions/generate-public", response_model=dict)
async def generate_public_attractions(
    trip_id: str,
    body: PublicAttractionGenerateRequest,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    try:
        data = await attraction_service.generate_public_attractions(db, trip.id, body)
        return {"data": [a.model_dump(by_alias=True) for a in data], "error": None}
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.")


@router.patch("/{trip_id}/attractions/{attraction_id}", response_model=dict)
async def toggle_attraction(
    trip_id: str,
    attraction_id: str,
    body: AttractionToggle,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    result = await attraction_service.toggle_attraction(
        db, trip.id, attraction_id, body.saved, body.excluded
    )
    if not result:
        raise HTTPException(status_code=404, detail="Attraction not found")
    return {"data": result.model_dump(by_alias=True), "error": None}
