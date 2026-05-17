import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.trip import Attraction, ItineraryItem, Trip
from ..models.user import User
from ..schemas.itinerary import ItineraryDayOut, ItineraryItemOut
from . import openai_service


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
        return []

    match = await db.get(Match, trip.match_id)
    if not match:
        return []

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        return []

    # Get saved attractions
    attr_result = await db.execute(
        select(Attraction).where(
            Attraction.trip_id == trip_id, Attraction.saved == True
        )
    )
    saved = [
        {"name": a.name, "category": a.category, "description": a.description}
        for a in attr_result.scalars().all()
    ]

    raw = await openai_service.generate_itinerary(
        user_a_code=user_a.tti_code or "",
        user_b_code=user_b.tti_code or "",
        saved_attractions=saved,
        preferences=trip.preferences_json or {},
    )

    # Delete old items
    old_result = await db.execute(
        select(ItineraryItem).where(ItineraryItem.trip_id == trip_id)
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    # Save new items
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
    return _group_by_day(all_items)


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
