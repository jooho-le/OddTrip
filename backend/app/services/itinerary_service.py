import uuid
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.trip import ItineraryItem, Place, Trip, TripAttraction
from ..models.user import User
from ..schemas.itinerary import ItineraryDayOut, ItineraryItemOut
from . import openai_service
from ..planner import InputPlace, ItineraryPlanner, PlanRequest


async def get_itinerary(db: AsyncSession, trip_id: str) -> list[ItineraryDayOut]:
    result = await db.execute(
        select(ItineraryItem)
        .where(ItineraryItem.trip_id == trip_id)
        .order_by(ItineraryItem.day, ItineraryItem.sort_order)
    )
    items = list(result.scalars().all())
    return _group_by_day(items)


async def generate_itinerary(db: AsyncSession, trip_id: str) -> list[ItineraryDayOut]:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")

    # Prefer saved attractions. If the user has not explicitly saved anything,
    # use all generated non-excluded attractions so the planner can still build
    # an executable demo itinerary.
    attractions = await _load_places_for_planning(db, trip_id, saved_only=True)
    if not attractions:
        attractions = await _load_places_for_planning(db, trip_id, saved_only=False)

    if attractions:
        all_items = await _generate_planner_itinerary(
            db=db,
            trip_id=trip_id,
            trip=trip,
            user_a=user_a,
            user_b=user_b,
            attractions=attractions,
        )
        return _group_by_day(all_items)

    raw = await openai_service.generate_itinerary(
        user_a_code=user_a.tti_code or "",
        user_b_code=user_b.tti_code or "",
        saved_attractions=[],
        preferences=trip.preferences_json or {},
    )

    all_items = await _save_raw_itinerary(db, trip_id, raw)
    return _group_by_day(all_items)


async def _load_places_for_planning(
    db: AsyncSession, trip_id: str, *, saved_only: bool
) -> list[tuple[TripAttraction, Place]]:
    """Places the planner may use.

    Prefers explicitly saved ones; callers fall back to every non-excluded
    attraction so a demo itinerary can still be produced.
    """
    condition = (
        TripAttraction.saved == True  # noqa: E712
        if saved_only
        else TripAttraction.excluded == False  # noqa: E712
    )
    result = await db.execute(
        select(TripAttraction, Place)
        .join(Place, Place.id == TripAttraction.place_id)
        .where(TripAttraction.trip_id == trip_id, condition)
        .order_by(TripAttraction.score.desc().nullslast(), TripAttraction.created_at)
    )
    return [(link, place) for link, place in result.all()]


async def _generate_planner_itinerary(
    *,
    db: AsyncSession,
    trip_id: str,
    trip: Trip,
    user_a: User,
    user_b: User,
    attractions: list[tuple[TripAttraction, Place]],
) -> list[ItineraryItem]:
    prefs = trip.preferences_json or {}
    start_date = _parse_trip_date(prefs.get("dateFrom")) or date.today()
    end_date = _parse_trip_date(prefs.get("dateTo")) or (start_date + timedelta(days=2))
    if end_date < start_date:
        end_date = start_date

    input_places = [
        InputPlace(
            id=place.id,
            name=place.name,
            category=place.category,
            description=place.description or "",
            famous=link.famous,
            active=place.active,
            latitude=place.latitude,
            longitude=place.longitude,
            indoor=place.indoor,
            opening_hours=place.opening_hours_json,
        )
        for link, place in attractions
    ]

    planner = ItineraryPlanner.create_default()
    planned_days = await planner.plan(
        PlanRequest(
            places=input_places,
            start_date=start_date,
            end_date=end_date,
            base_region=str(prefs.get("region", "서울특별시")),
            pace=int(prefs.get("pace", 50) or 50),
            traveler_context=f"User A {user_a.tti_code or ''}, User B {user_b.tti_code or ''}",
        )
    )

    old_result = await db.execute(
        select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    all_items = []
    for planned_day in planned_days:
        for idx, slot in enumerate(planned_day.slots):
            item = ItineraryItem(
                id=str(uuid.uuid4()),
                trip_id=trip_id,
                day=planned_day.day_number,
                day_title=planned_day.title,
                day_weather=planned_day.weather.description,
                day_caution=planned_day.caution,
                time=f"{slot.start_time.hour:02d}:{slot.start_time.minute:02d}",
                type=slot.slot_type,
                title=slot.title,
                location=slot.location,
                duration=f"{slot.duration_minutes}분",
                move_time=f"{slot.move_duration_minutes}분" if slot.move_duration_minutes else None,
                description=slot.description,
                ai_reason=slot.ai_reason,
                sort_order=idx,
            )
            db.add(item)
            all_items.append(item)

    await db.commit()
    return all_items


async def _save_raw_itinerary(
    db: AsyncSession,
    trip_id: str,
    raw: list[dict],
) -> list[ItineraryItem]:
    old_result = await db.execute(
        select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    all_items = []
    for day_data in raw:
        day_num = day_data.get("day", 1)
        for idx, item_data in enumerate(day_data.get("items", [])):
            item = ItineraryItem(
                id=str(uuid.uuid4()),
                trip_id=trip_id,
                day=day_num,
                day_title=day_data.get("title", ""),
                day_weather=day_data.get("weather", ""),
                day_caution=day_data.get("caution", ""),
                time=item_data.get("time", ""),
                type=item_data.get("type", "place"),
                title=item_data.get("title", ""),
                location=item_data.get("location", ""),
                duration=item_data.get("duration", ""),
                move_time=item_data.get("moveTime"),
                description=item_data.get("description", ""),
                ai_reason=item_data.get("aiReason", ""),
                sort_order=idx,
            )
            db.add(item)
            all_items.append(item)

    await db.commit()
    return all_items


def _group_by_day(items: list[ItineraryItem]) -> list[ItineraryDayOut]:
    days: dict[int, ItineraryDayOut] = {}
    for item in items:
        if item.day not in days:
            days[item.day] = ItineraryDayOut(
                day=item.day,
                title=item.day_title or "",
                weather=item.day_weather or "",
                caution=item.day_caution or "",
                items=[],
            )
        days[item.day].items.append(
            ItineraryItemOut(
                id=item.id,
                day=item.day,
                time=item.time,
                type=item.type,
                title=item.title,
                location=item.location,
                duration=item.duration,
                move_time=item.move_time,
                description=item.description,
                ai_reason=item.ai_reason,
            )
        )
    return [days[k] for k in sorted(days.keys())]


def _parse_trip_date(value: object) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
