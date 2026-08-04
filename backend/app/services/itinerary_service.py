import uuid
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.trip import ItineraryDay, ItineraryItem, Place, Trip, TripAttraction
from ..models.user import User
from ..schemas.itinerary import ItineraryDayOut, ItineraryItemOut
from . import openai_service
from ..planner import InputPlace, ItineraryPlanner, PlanRequest


async def get_itinerary(db: AsyncSession, trip_id: str) -> list[ItineraryDayOut]:
    result = await db.execute(
        select(ItineraryDay, ItineraryItem, Place)
        .outerjoin(ItineraryItem, ItineraryItem.day_id == ItineraryDay.id)
        .outerjoin(Place, Place.id == ItineraryItem.place_id)
        .where(ItineraryDay.trip_id == trip_id)
        .order_by(ItineraryDay.day_number, ItineraryItem.sort_order)
    )
    return _to_day_out(result.all())


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

    attractions = await _load_places_for_planning(db, trip_id)

    if attractions:
        await _generate_planner_itinerary(
            db=db,
            trip_id=trip_id,
            trip=trip,
            user_a=user_a,
            user_b=user_b,
            attractions=attractions,
        )
        return await get_itinerary(db, trip_id)

    raw = await openai_service.generate_itinerary(
        user_a_code=user_a.tti_code or "",
        user_b_code=user_b.tti_code or "",
        saved_attractions=[],
        preferences=trip.preferences_json or {},
    )

    await _save_raw_itinerary(db, trip_id, raw)
    return await get_itinerary(db, trip_id)


async def _load_places_for_planning(
    db: AsyncSession, trip_id: str
) -> list[tuple[TripAttraction, Place]]:
    """Every candidate the planner may use.

    Excluding is the only way to keep a place out. Leaving one untouched means
    "no opinion", not "reject", so it stays a candidate — previously a single
    save silently dropped every place the traveller had not explicitly kept.

    Saved places sort first so they survive if the day runs out of hours.
    """
    result = await db.execute(
        select(TripAttraction, Place)
        .join(Place, Place.id == TripAttraction.place_id)
        .where(
            TripAttraction.trip_id == trip_id,
            TripAttraction.excluded == False,  # noqa: E712
        )
        .order_by(
            TripAttraction.saved.desc(),
            TripAttraction.score.desc().nullslast(),
            TripAttraction.created_at,
        )
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
    start_date = trip.start_date or date.today()
    end_date = trip.end_date or (start_date + timedelta(days=2))
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
            base_region=trip.region or "서울특별시",
            pace=int(prefs.get("pace", 50) or 50),
            traveler_context=f"User A {user_a.tti_code or ''}, User B {user_b.tti_code or ''}",
        )
    )

    await _delete_existing_days(db, trip_id)

    for planned_day in planned_days:
        day = ItineraryDay(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            day_number=planned_day.day_number,
            target_date=planned_day.target_date,
            title=planned_day.title,
            weather=planned_day.weather.description,
            caution=planned_day.caution,
        )
        db.add(day)
        for idx, slot in enumerate(planned_day.slots):
            db.add(ItineraryItem(
                id=str(uuid.uuid4()),
                day_id=day.id,
                # PlannedPlace.input_id is the places.id handed to the planner,
                # so place slots link straight back to the place row.
                place_id=slot.place_ref.input_id if slot.place_ref else None,
                time=f"{slot.start_time.hour:02d}:{slot.start_time.minute:02d}",
                type=slot.slot_type,
                title=slot.title,
                location=slot.location,
                duration=f"{slot.duration_minutes}분",
                move_time=f"{slot.move_duration_minutes}분" if slot.move_duration_minutes else None,
                description=slot.description,
                ai_reason=slot.ai_reason,
                sort_order=idx,
            ))

    await db.commit()


async def _save_raw_itinerary(db: AsyncSession, trip_id: str, raw: list[dict]) -> None:
    """Persist the OpenAI fallback itinerary, which carries no place ids."""
    await _delete_existing_days(db, trip_id)

    for day_data in raw:
        day = ItineraryDay(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            day_number=day_data.get("day", 1),
            title=day_data.get("title", ""),
            weather=day_data.get("weather", ""),
            caution=day_data.get("caution", ""),
        )
        db.add(day)
        for idx, item_data in enumerate(day_data.get("items", [])):
            db.add(ItineraryItem(
                id=str(uuid.uuid4()),
                day_id=day.id,
                time=item_data.get("time", ""),
                type=item_data.get("type", "place"),
                title=item_data.get("title", ""),
                location=item_data.get("location", ""),
                duration=item_data.get("duration", ""),
                move_time=item_data.get("moveTime"),
                description=item_data.get("description", ""),
                ai_reason=item_data.get("aiReason", ""),
                sort_order=idx,
            ))

    await db.commit()


async def _delete_existing_days(db: AsyncSession, trip_id: str) -> None:
    """Slots go with the day rows via ON DELETE CASCADE."""
    await db.execute(delete(ItineraryDay).where(ItineraryDay.trip_id == trip_id))
    await db.flush()


def _to_day_out(
    rows: list[tuple[ItineraryDay, ItineraryItem | None, Place | None]]
) -> list[ItineraryDayOut]:
    """Assemble the joined rows into the nested shape the API returns.

    The outer join yields one row per slot, plus a single row with a NULL slot
    for a day that has none, so days always survive the round trip.
    """
    days: dict[str, ItineraryDayOut] = {}
    for day, item, place in rows:
        out = days.get(day.id)
        if out is None:
            out = ItineraryDayOut(
                day=day.day_number,
                title=day.title or "",
                weather=day.weather or "",
                caution=day.caution or "",
                items=[],
            )
            days[day.id] = out
        if item is None:
            continue
        out.items.append(
            ItineraryItemOut(
                id=item.id,
                day=day.day_number,
                place_id=item.place_id,
                latitude=place.latitude if place else None,
                longitude=place.longitude if place else None,
                address=place.addr1 if place else None,
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
    return sorted(days.values(), key=lambda d: d.day)


