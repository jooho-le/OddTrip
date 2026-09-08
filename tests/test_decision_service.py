import asyncio
import uuid

from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import Match, Trip, TripUserPreference, User
from backend.app.services import decision_service
from tests.test_chat_service import _sqlite_test_engine


def test_pair_preferences_are_stored_separately_and_compared() -> None:
    asyncio.run(_test_pair_preferences_are_stored_separately_and_compared())


async def _test_pair_preferences_are_stored_separately_and_compared() -> None:
    engine = _sqlite_test_engine()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_a = User(id=str(uuid.uuid4()), nickname="A")
    user_b = User(id=str(uuid.uuid4()), nickname="B")
    match = Match(
        id=str(uuid.uuid4()), user_id=user_a.id, matched_user_id=user_b.id,
        status="active", match_level="추천", recommendation_score=70,
    )
    trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status="planning")

    async with sessions() as db:
        db.add_all([user_a, user_b, match, trip])
        await db.commit()

        await decision_service.update_personal_preferences(db, trip, user_a.id, {
            "places": ["시장", "미술관"], "activities": ["산책"], "foods": ["한식"],
            "pace": 70, "budget": 40, "indoorPreferred": False, "hiddenSpots": True,
        })
        waiting = await decision_service.get_pair_preferences(db, trip, user_a.id)
        assert waiting["bothSubmitted"] is False
        assert waiting["comparison"] is None

        await decision_service.update_personal_preferences(db, trip, user_b.id, {
            "places": ["미술관", "카페"], "activities": ["산책"], "foods": ["양식"],
            "pace": 40, "budget": 60, "indoorPreferred": True, "hiddenSpots": True,
        })
        result = await decision_service.get_pair_preferences(db, trip, user_a.id)

        assert result["bothSubmitted"] is True
        assert result["mine"]["userId"] == user_a.id
        assert result["counterpart"]["userId"] == user_b.id
        assert result["comparison"]["places"] == {
            "common": ["미술관"], "onlyMine": ["시장"], "onlyCounterpart": ["카페"]
        }
        assert result["comparison"]["paceDifference"] == 30
        assert result["comparison"]["indoorPreferredConflict"] is True
        assert result["agreed"] is None

        assert len((await db.execute(
            TripUserPreference.__table__.select().where(TripUserPreference.trip_id == trip.id)
        )).all()) == 2

    await engine.dispose()


def test_pair_preference_routes_are_registered() -> None:
    from backend.app.main import app

    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert ("/api/trips/{trip_id}/preferences/me", "PUT") in routes
    assert ("/api/trips/{trip_id}/preferences/pair", "GET") in routes
