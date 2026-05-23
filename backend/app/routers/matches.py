import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.match import Match
from ..models.trip import Attraction, ItineraryItem, SafetyAlert, Trip
from ..models.user import User
from ..services import match_service
from ..services.match_service import _calc_score, _count_opposite_axes

router = APIRouter()


@router.get("", response_model=dict)
async def get_matches(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidates = await match_service.find_matches(db, user)
    return {"data": [c.model_dump(by_alias=True) for c in candidates], "error": None}


@router.get("/{match_id}", response_model=dict)
async def get_match_detail(
    match_id: str,
    db: AsyncSession = Depends(get_db),
):
    match = await match_service.get_match_by_id(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"data": {"id": match.id, "matchLevel": match.match_level, "recommendationScore": match.recommendation_score}, "error": None}


@router.post("/{matched_user_id}/accept", response_model=dict)
async def accept_match(
    matched_user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Reject self-match
    if user.id == matched_user_id:
        raise HTTPException(status_code=400, detail="자기 자신과는 매칭할 수 없습니다.")

    # Verify target user exists
    target = await db.get(User, matched_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")

    # Calculate actual match level and score from the latest TTI result.
    user_code = user.tti_code or ""
    target_code = target.tti_code or ""

    if user_code and target_code:
        count, diff_axes = _count_opposite_axes(user_code, target_code)
        match_level = {4: "완전 반대", 3: "부분 반대"}.get(count, "추천")
        score = _calc_score(count, user.tti_scores_json or [], target.tti_scores_json)
        differences = [match_service.AXIS_LABELS[ax] for ax in diff_axes]
        complements = []
        for ax in diff_axes:
            complements.extend(match_service.COMPLEMENT_TEMPLATES.get(ax, []))
    else:
        match_level = "추천"
        score = 70
        differences = []
        complements = []

    compatibility = f"당신의 여행 스타일과 {target.nickname}님의 스타일이 상호보완적입니다."

    # Check for existing match in BOTH directions (idempotency)
    existing = await db.execute(
        select(Match).where(
            or_(
                (Match.user_id == user.id) & (Match.matched_user_id == matched_user_id),
                (Match.user_id == matched_user_id) & (Match.matched_user_id == user.id),
            )
        )
    )
    existing_match = existing.scalar_one_or_none()
    if existing_match:
        changed = (
            existing_match.match_level != match_level
            or existing_match.recommendation_score != min(score, 100)
            or existing_match.differences_json != differences
            or existing_match.complements_json != complements[:4]
        )
        existing_match.match_level = match_level
        existing_match.recommendation_score = min(score, 100)
        existing_match.compatibility = compatibility
        existing_match.differences_json = differences
        existing_match.complements_json = complements[:4]

        trip_result = await db.execute(
            select(Trip).where(Trip.match_id == existing_match.id)
        )
        existing_trip = trip_result.scalar_one_or_none()
        if changed and existing_trip:
            await _clear_trip_outputs(db, existing_trip.id)
        if not existing_trip:
            existing_trip = Trip(id=str(uuid.uuid4()), match_id=existing_match.id, status="planning")
            db.add(existing_trip)
        await db.commit()
        return {
            "data": {"matchId": existing_match.id, "tripId": existing_trip.id if existing_trip else None},
            "error": None,
        }

    match = Match(
        id=str(uuid.uuid4()),
        user_id=user.id,
        matched_user_id=matched_user_id,
        match_level=match_level,
        recommendation_score=min(score, 100),
        compatibility=compatibility,
        differences_json=differences,
        complements_json=complements[:4],
    )
    db.add(match)
    await db.flush()

    trip_id = str(uuid.uuid4())
    trip = Trip(id=trip_id, match_id=match.id, status="planning")
    db.add(trip)
    await db.commit()

    return {
        "data": {"matchId": match.id, "tripId": trip_id},
        "error": None,
    }


async def _clear_trip_outputs(db: AsyncSession, trip_id: str) -> None:
    for model in (Attraction, ItineraryItem, SafetyAlert):
        result = await db.execute(select(model).where(model.trip_id == trip_id))
        for row in result.scalars().all():
            await db.delete(row)
