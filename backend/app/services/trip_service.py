import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.notification import Notification
from ..models.trip import ItineraryDay, SafetyAlert, Trip, TripAttraction
from ..models.user import User
from ..schemas.trip import (
    TripCancelOut,
    TripCreateIn,
    TripPartnerOut,
    TripSummaryOut,
    TripUpdateIn,
    validate_trip_dates,
)
from . import notification_service

CURRENT_STATUSES = ("planning", "confirmed")


async def create_trip(
    db: AsyncSession, user: User, body: TripCreateIn
) -> tuple[Trip, list[Notification], Match]:
    match = (await db.execute(
        select(Match).where(Match.id == body.match_id).with_for_update()
    )).scalar_one_or_none()
    if not match or match.deleted_at is not None:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    counterpart_id = _counterpart_id(match, user.id)
    if match.status != "active":
        raise HTTPException(status_code=409, detail="활성 매칭에서만 새 여행을 만들 수 있습니다.")
    current = (await db.execute(
        select(Trip.id).where(Trip.match_id == match.id, Trip.status.in_(CURRENT_STATUSES))
    )).scalar_one_or_none()
    if current:
        raise HTTPException(status_code=409, detail="이 동행과 진행 중인 여행이 이미 있습니다.")

    trip = Trip(
        id=str(uuid.uuid4()),
        match_id=match.id,
        title=body.title or None,
        region=body.region,
        start_date=body.start_date,
        end_date=body.end_date,
        status="planning",
    )
    db.add(trip)
    notification = notification_service.build(
        user_id=counterpart_id,
        type=notification_service.TRIP_CREATED,
        title=f"{user.nickname}님이 새 여행을 만들었어요",
        body=f"{body.region} · {body.start_date} — {body.end_date}",
        link="/my",
        payload={"tripId": trip.id, "matchId": match.id},
    )
    db.add(notification)
    await db.commit()
    await db.refresh(trip)
    return trip, [notification], match


async def update_trip(
    db: AsyncSession, trip_id: str, user: User, body: TripUpdateIn
) -> tuple[Trip, list[Notification], Match, bool]:
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id).with_for_update()
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    match = await db.get(Match, trip.match_id)
    if not match or match.deleted_at is not None:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    counterpart_id = _counterpart_id(match, user.id)
    if match.status != "active":
        raise HTTPException(status_code=409, detail="활성 매칭의 여행만 수정할 수 있습니다.")
    if trip.status in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail="완료되거나 취소된 여행은 수정할 수 없습니다.")

    fields = body.model_fields_set
    start_date = body.start_date if "start_date" in fields else trip.start_date
    end_date = body.end_date if "end_date" in fields else trip.end_date
    if start_date is None or end_date is None:
        raise HTTPException(status_code=422, detail="여행 시작일과 종료일이 필요합니다.")
    try:
        validate_trip_dates(start_date, end_date)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))

    changed_fields: list[str] = []
    for field in ("title", "region", "start_date", "end_date"):
        if field not in fields:
            continue
        value = getattr(body, field)
        if getattr(trip, field) != value:
            setattr(trip, field, value)
            changed_fields.append(field)
    if not changed_fields:
        return trip, [], match, False

    invalidates_itinerary = any(
        field in changed_fields for field in ("region", "start_date", "end_date")
    )
    if invalidates_itinerary:
        day_count = int((await db.execute(
            select(func.count(ItineraryDay.id)).where(ItineraryDay.trip_id == trip.id)
        )).scalar_one())
        if day_count:
            trip.itinerary_revision = (trip.itinerary_revision or 0) + 1
            await db.execute(delete(ItineraryDay).where(ItineraryDay.trip_id == trip.id))
        await db.execute(delete(SafetyAlert).where(SafetyAlert.trip_id == trip.id))
        trip.status = "planning"

    notification = notification_service.build(
        user_id=counterpart_id,
        type=notification_service.TRIP_UPDATED,
        title=f"{user.nickname}님이 여행 정보를 수정했어요",
        body="제목, 지역 또는 여행 기간이 변경됐습니다.",
        link="/trip/overview",
        payload={
            "tripId": trip.id,
            "changedFields": changed_fields,
            "itineraryInvalidated": invalidates_itinerary,
        },
    )
    db.add(notification)
    await db.commit()
    await db.refresh(trip)
    return trip, [notification], match, invalidates_itinerary


async def cancel_trip(
    db: AsyncSession, trip_id: str, user: User
) -> tuple[TripCancelOut, list[Notification], Match]:
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id).with_for_update()
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    counterpart_id = _counterpart_id(match, user.id)
    if trip.status == "completed":
        raise HTTPException(status_code=409, detail="완료된 여행은 취소할 수 없습니다.")
    if trip.status == "cancelled":
        return _cancel_out(trip), [], match

    now = datetime.utcnow()
    trip.status = "cancelled"
    trip.cancelled_at = now
    trip.cancelled_by = user.id
    notification = notification_service.build(
        user_id=counterpart_id,
        type=notification_service.TRIP_CANCELLED,
        title=f"{user.nickname}님이 여행을 취소했어요",
        body=trip.title or f"{trip.region or 'OddTrip'} 여행",
        link="/my",
        payload={"tripId": trip.id, "matchId": match.id},
    )
    db.add(notification)
    await db.commit()
    await db.refresh(trip)
    return _cancel_out(trip), [notification], match


async def to_summary(db: AsyncSession, trip: Trip, user_id: str) -> TripSummaryOut:
    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    counterpart = await db.get(User, _counterpart_id(match, user_id))
    attraction_count = int((await db.execute(
        select(func.count(TripAttraction.id)).where(TripAttraction.trip_id == trip.id)
    )).scalar_one())
    saved_count = int((await db.execute(
        select(func.count(TripAttraction.id)).where(
            TripAttraction.trip_id == trip.id, TripAttraction.saved == True  # noqa: E712
        )
    )).scalar_one())
    itinerary_day_count = int((await db.execute(
        select(func.count(ItineraryDay.id)).where(ItineraryDay.trip_id == trip.id)
    )).scalar_one())
    return TripSummaryOut(
        trip_id=trip.id,
        match_id=match.id,
        partner=(
            TripPartnerOut(
                id=counterpart.id,
                nickname=counterpart.nickname,
                avatar_url=counterpart.avatar_url,
                tti_code=counterpart.tti_code,
            )
            if counterpart else None
        ),
        title=trip.title,
        region=trip.region,
        start_date=trip.start_date,
        end_date=trip.end_date,
        status=trip.status,
        attraction_count=attraction_count,
        saved_count=saved_count,
        itinerary_day_count=itinerary_day_count,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        cancelled_at=trip.cancelled_at,
        cancelled_by=trip.cancelled_by,
    )


def _counterpart_id(match: Match, user_id: str) -> str:
    if match.user_id == user_id:
        return match.matched_user_id
    if match.matched_user_id == user_id:
        return match.user_id
    raise HTTPException(status_code=403, detail="이 매칭의 참여자가 아닙니다.")


def _cancel_out(trip: Trip) -> TripCancelOut:
    if trip.cancelled_at is None or trip.cancelled_by is None:
        raise HTTPException(status_code=409, detail="여행 취소 정보가 올바르지 않습니다.")
    return TripCancelOut(
        trip_id=trip.id,
        status=trip.status,
        cancelled_at=trip.cancelled_at,
        cancelled_by=trip.cancelled_by,
    )
