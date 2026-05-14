from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..schemas.decision import JointPreferenceOut
from . import openai_service

DEFAULT_PREFERENCES = {
    "places": [],
    "activities": [],
    "foods": [],
    "pace": 50,
    "budget": 50,
    "indoorPreferred": False,
    "hiddenSpots": False,
}


async def get_preferences(db: AsyncSession, trip_id: str) -> JointPreferenceOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        return JointPreferenceOut(**DEFAULT_PREFERENCES)

    prefs = trip.preferences_json or DEFAULT_PREFERENCES
    return JointPreferenceOut(
        places=prefs.get("places", []),
        activities=prefs.get("activities", []),
        foods=prefs.get("foods", []),
        pace=prefs.get("pace", 50),
        budget=prefs.get("budget", 50),
        indoor_preferred=prefs.get("indoorPreferred", False),
        hidden_spots=prefs.get("hiddenSpots", False),
    )


async def update_preferences(
    db: AsyncSession, trip_id: str, prefs: dict
) -> JointPreferenceOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        return JointPreferenceOut(**DEFAULT_PREFERENCES)

    trip.preferences_json = prefs
    await db.commit()
    return JointPreferenceOut(
        places=prefs.get("places", []),
        activities=prefs.get("activities", []),
        foods=prefs.get("foods", []),
        pace=prefs.get("pace", 50),
        budget=prefs.get("budget", 50),
        indoor_preferred=prefs.get("indoorPreferred", False),
        hidden_spots=prefs.get("hiddenSpots", False),
    )


async def resolve_conflict(
    db: AsyncSession, trip_id: str, conflicts: list[str]
) -> str:
    trip = await db.get(Trip, trip_id)
    if not trip:
        return "여행 정보를 찾을 수 없습니다."

    match = await db.get(Match, trip.match_id)
    if not match:
        return "매칭 정보를 찾을 수 없습니다."

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)

    return await openai_service.resolve_conflict(
        user_a_code=user_a.tti_code if user_a else "",
        user_b_code=user_b.tti_code if user_b else "",
        preferences=trip.preferences_json or {},
        conflicts=conflicts,
    )
