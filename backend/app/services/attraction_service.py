import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trip import Attraction, Trip
from ..models.match import Match
from ..models.user import User
from ..schemas.attraction import AttractionOut
from . import openai_service


async def get_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
    result = await db.execute(
        select(Attraction).where(Attraction.trip_id == trip_id)
    )
    rows = result.scalars().all()
    return [
        AttractionOut(
            id=r.id,
            name=r.name,
            category=r.category,
            image_url=r.image_url,
            description=r.description,
            reason=r.reason,
            tags=r.tags_json or [],
            indoor=r.indoor,
            active=r.active,
            famous=r.famous,
            saved=r.saved,
            excluded=r.excluded,
        )
        for r in rows
    ]


async def generate_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
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

    # Delete existing attractions before regenerating
    old_result = await db.execute(
        select(Attraction).where(Attraction.trip_id == trip_id)
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    raw = await openai_service.generate_attractions(
        user_a_code=user_a.tti_code or "",
        user_a_scores=user_a.tti_scores_json or [],
        user_b_code=user_b.tti_code or "",
        user_b_scores=user_b.tti_scores_json or [],
        preferences=trip.preferences_json or {},
    )

    attractions = []
    for item in raw:
        attr = Attraction(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            name=item.get("name", ""),
            category=item.get("category", ""),
            image_url=item.get("imageUrl", ""),
            description=item.get("description", ""),
            reason=item.get("reason", ""),
            tags_json=item.get("tags", []),
            indoor=item.get("indoor", False),
            active=item.get("active", False),
            famous=item.get("famous", False),
        )
        db.add(attr)
        attractions.append(attr)

    await db.commit()
    return [
        AttractionOut(
            id=a.id,
            name=a.name,
            category=a.category,
            image_url=a.image_url,
            description=a.description,
            reason=a.reason,
            tags=a.tags_json or [],
            indoor=a.indoor,
            active=a.active,
            famous=a.famous,
            saved=a.saved,
            excluded=a.excluded,
        )
        for a in attractions
    ]


async def toggle_attraction(
    db: AsyncSession, trip_id: str, attraction_id: str, saved: bool | None, excluded: bool | None
) -> AttractionOut | None:
    result = await db.execute(
        select(Attraction).where(
            Attraction.id == attraction_id, Attraction.trip_id == trip_id
        )
    )
    attr = result.scalar_one_or_none()
    if not attr:
        return None

    if saved is not None:
        attr.saved = saved
    if excluded is not None:
        attr.excluded = excluded

    await db.commit()
    return AttractionOut(
        id=attr.id,
        name=attr.name,
        category=attr.category,
        image_url=attr.image_url,
        description=attr.description,
        reason=attr.reason,
        tags=attr.tags_json or [],
        indoor=attr.indoor,
        active=attr.active,
        famous=attr.famous,
        saved=attr.saved,
        excluded=attr.excluded,
    )
