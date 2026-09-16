import asyncio
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import ItineraryDay, Match, SafetyAlert, TripApproval, User
from backend.app.schemas.trip import TripCreateIn, TripUpdateIn
from backend.app.services import approval_service, trip_service
from tests.test_chat_service import _sqlite_test_engine


def test_trip_create_update_cancel_lifecycle() -> None:
    asyncio.run(_test_trip_create_update_cancel_lifecycle())


async def _test_trip_create_update_cancel_lifecycle() -> None:
    engine = _sqlite_test_engine()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_a = User(id=str(uuid.uuid4()), nickname="A")
    user_b = User(id=str(uuid.uuid4()), nickname="B")
    match = Match(
        id=str(uuid.uuid4()), user_id=user_a.id, matched_user_id=user_b.id,
        status="active", match_level="추천", recommendation_score=80,
    )

    async with sessions() as db:
        db.add_all([user_a, user_b, match])
        await db.commit()

        trip, created_notifications, _ = await trip_service.create_trip(
            db,
            user_a,
            TripCreateIn(
                match_id=match.id,
                title="부산 주말",
                region="부산",
                start_date=date(2026, 10, 1),
                end_date=date(2026, 10, 3),
            ),
        )
        assert trip.status == "planning"
        assert created_notifications[0].user_id == user_b.id

        with pytest.raises(HTTPException) as duplicate:
            await trip_service.create_trip(
                db,
                user_a,
                TripCreateIn(
                    match_id=match.id,
                    region="제주",
                    start_date=date(2026, 11, 1),
                    end_date=date(2026, 11, 3),
                ),
            )
        assert duplicate.value.status_code == 409

        day = ItineraryDay(id=str(uuid.uuid4()), trip_id=trip.id, day_number=1, title="첫날")
        approval = TripApproval(
            id=str(uuid.uuid4()), trip_id=trip.id, user_id=user_a.id,
            itinerary_revision=0, status=approval_service.APPROVED,
        )
        alert = SafetyAlert(
            id=str(uuid.uuid4()), trip_id=trip.id, level="info", title="날씨",
        )
        db.add_all([day, approval, alert])
        await db.commit()

        updated, updated_notifications, _, invalidated = await trip_service.update_trip(
            db, trip.id, user_a, TripUpdateIn(region="경주")
        )
        assert updated.region == "경주"
        assert updated.itinerary_revision == 1
        assert invalidated is True
        assert updated_notifications[0].user_id == user_b.id
        assert (await db.execute(select(ItineraryDay))).scalars().all() == []
        assert (await db.execute(select(SafetyAlert))).scalars().all() == []
        # The old response remains an audit row but is no longer current.
        assert len((await db.execute(select(TripApproval))).scalars().all()) == 1
        state = await approval_service.get_state(db, updated, user_a.id)
        assert state.mine.status == "pending"

        cancelled, cancelled_notifications, _ = await trip_service.cancel_trip(
            db, trip.id, user_b
        )
        assert cancelled.status == "cancelled"
        assert cancelled.cancelled_by == user_b.id
        assert cancelled_notifications[0].user_id == user_a.id

        repeated, repeated_notifications, _ = await trip_service.cancel_trip(
            db, trip.id, user_b
        )
        assert repeated.status == "cancelled"
        assert repeated_notifications == []

        next_trip, _, _ = await trip_service.create_trip(
            db,
            user_b,
            TripCreateIn(
                match_id=match.id,
                region="제주",
                start_date=date(2026, 11, 1),
                end_date=date(2026, 11, 3),
            ),
        )
        assert next_trip.id != trip.id

    await engine.dispose()


def test_trip_date_range_is_limited_to_thirty_days() -> None:
    with pytest.raises(ValidationError):
        TripCreateIn(
            match_id="match-1",
            region="부산",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 2, 1),
        )

    with pytest.raises(ValidationError):
        TripCreateIn(
            match_id="match-1",
            region="   ",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 2),
        )


def test_trip_routes_are_registered() -> None:
    from backend.app.main import app

    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert ("/api/trips", "POST") in routes
    assert ("/api/trips/{trip_id}", "GET") in routes
    assert ("/api/trips/{trip_id}", "PATCH") in routes
    assert ("/api/trips/{trip_id}", "DELETE") in routes
