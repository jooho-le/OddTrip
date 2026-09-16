from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ..dependencies import get_current_user, get_current_user_trip, get_db
from ..models.match import Match
from ..models.communication import MatchUserState
from ..models.trip import ItineraryDay, Trip, TripAttraction
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.trip import TripCreateIn, TripPartnerOut, TripSummaryOut, TripUpdateIn
from ..services import notification_service, trip_service

router = APIRouter()


@router.post("", response_model=dict, status_code=201)
async def create_trip(
    body: TripCreateIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip, notifications, match = await trip_service.create_trip(db, user, body)
    data = await trip_service.to_summary(db, trip, user.id)
    await notification_service.push(notifications)
    await _broadcast(match, "trip.created", trip.id, trip.status)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("", response_model=dict)
async def list_trips(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Every trip the caller takes part in, newest first.

    The client starts each session empty, so this is the only way back to a
    trip that was planned earlier.
    """
    partner = aliased(User)
    # The caller sits on either side of the match, so the partner is whichever
    # column is not them.
    partner_id = func.coalesce(
        func.nullif(Match.user_id, user.id),
        func.nullif(Match.matched_user_id, user.id),
    )

    result = await db.execute(
        select(Trip, Match, partner)
        .join(Match, Match.id == Trip.match_id)
        .outerjoin(
            MatchUserState,
            (MatchUserState.match_id == Match.id) & (MatchUserState.user_id == user.id),
        )
        .outerjoin(partner, partner.id == partner_id)
        .where(
            or_(Match.user_id == user.id, Match.matched_user_id == user.id),
            Match.deleted_at.is_(None),
            or_(MatchUserState.hidden_at.is_(None), MatchUserState.user_id.is_(None)),
        )
        .order_by(Trip.created_at.desc())
    )
    rows = result.all()
    if not rows:
        return {"data": [], "error": None}

    trip_ids = [trip.id for trip, _, _ in rows]
    attractions = dict(
        (
            await db.execute(
                select(
                    TripAttraction.trip_id,
                    func.count(TripAttraction.id),
                )
                .where(TripAttraction.trip_id.in_(trip_ids))
                .group_by(TripAttraction.trip_id)
            )
        ).all()
    )
    saved = dict(
        (
            await db.execute(
                select(TripAttraction.trip_id, func.count(TripAttraction.id))
                .where(
                    TripAttraction.trip_id.in_(trip_ids),
                    TripAttraction.saved == True,  # noqa: E712
                )
                .group_by(TripAttraction.trip_id)
            )
        ).all()
    )
    days = dict(
        (
            await db.execute(
                select(ItineraryDay.trip_id, func.count(ItineraryDay.id))
                .where(ItineraryDay.trip_id.in_(trip_ids))
                .group_by(ItineraryDay.trip_id)
            )
        ).all()
    )

    data = [
        TripSummaryOut(
            trip_id=trip.id,
            match_id=match.id,
            partner=(
                TripPartnerOut(
                    id=other.id,
                    nickname=other.nickname,
                    avatar_url=other.avatar_url,
                    tti_code=other.tti_code,
                )
                if other
                else None
            ),
            title=trip.title,
            region=trip.region,
            start_date=trip.start_date,
            end_date=trip.end_date,
            status=trip.status,
            attraction_count=attractions.get(trip.id, 0),
            saved_count=saved.get(trip.id, 0),
            itinerary_day_count=days.get(trip.id, 0),
            created_at=trip.created_at,
            updated_at=trip.updated_at,
            cancelled_at=trip.cancelled_at,
            cancelled_by=trip.cancelled_by,
        ).model_dump(by_alias=True)
        for trip, match, other in rows
    ]
    return {"data": data, "error": None}


@router.get("/{trip_id}", response_model=dict)
async def get_trip(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await trip_service.to_summary(db, trip, user.id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.patch("/{trip_id}", response_model=dict)
async def update_trip(
    trip_id: str,
    body: TripUpdateIn,
    _: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip, notifications, match, invalidated = await trip_service.update_trip(
        db, trip_id, user, body
    )
    data = await trip_service.to_summary(db, trip, user.id)
    if notifications:
        await notification_service.push(notifications)
        await _broadcast(
            match, "trip.updated", trip.id, trip.status,
            itineraryInvalidated=invalidated,
        )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.delete("/{trip_id}", response_model=dict)
async def cancel_trip(
    trip_id: str,
    _: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, notifications, match = await trip_service.cancel_trip(db, trip_id, user)
    if notifications:
        await notification_service.push(notifications)
        await _broadcast(match, "trip.cancelled", trip_id, data.status)
    return {"data": data.model_dump(by_alias=True), "error": None}


async def _broadcast(match: Match, event: str, trip_id: str, status: str, **extra) -> None:
    await chat_connection_manager.send_to_users(
        {match.user_id, match.matched_user_id},
        {"event": event, "data": {"tripId": trip_id, "status": status, **extra}},
    )
