import asyncio
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import ItineraryDay, Match, Notification, Trip, TripApproval, User
from backend.app.schemas.approval import ApprovalActionIn
from backend.app.services import approval_service, itinerary_service
from tests.test_chat_service import _sqlite_test_engine


def test_two_travellers_confirm_and_change_request_reopens_trip() -> None:
    asyncio.run(_test_two_travellers_confirm_and_change_request_reopens_trip())


async def _test_two_travellers_confirm_and_change_request_reopens_trip() -> None:
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
    trip = Trip(
        id=str(uuid.uuid4()), match_id=match.id, status="planning", itinerary_revision=1,
    )
    day = ItineraryDay(id=str(uuid.uuid4()), trip_id=trip.id, day_number=1, title="첫날")

    async with sessions() as db:
        db.add_all([user_a, user_b, match, trip, day])
        await db.commit()

        initial = await approval_service.get_state(db, trip, user_a.id)
        assert initial.mine.status == "pending"
        assert initial.counterpart.status == "pending"
        assert initial.all_approved is False

        first, first_notifications, _ = await approval_service.respond(
            db, trip.id, user_a.id, ApprovalActionIn(action="approve")
        )
        assert first.mine.status == "approved"
        assert first.counterpart.status == "pending"
        assert first.trip_status == "planning"
        assert first_notifications[0].user_id == user_b.id

        repeated, repeated_notifications, _ = await approval_service.respond(
            db, trip.id, user_a.id, ApprovalActionIn(action="approve")
        )
        assert repeated.mine.status == "approved"
        assert repeated_notifications == []

        second, _, _ = await approval_service.respond(
            db, trip.id, user_b.id, ApprovalActionIn(action="approve")
        )
        assert second.all_approved is True
        assert second.trip_status == "confirmed"
        assert (await db.get(Trip, trip.id)).status == "confirmed"

        reopened, _, _ = await approval_service.respond(
            db,
            trip.id,
            user_a.id,
            ApprovalActionIn(action="change_request", comment="이동량을 줄여 주세요."),
        )
        assert reopened.all_approved is False
        assert reopened.mine.status == "change_requested"
        assert reopened.trip_status == "planning"
        assert int((await db.execute(select(func.count(Notification.id)))).scalar_one()) == 3

    await engine.dispose()


def test_itinerary_revision_invalidates_existing_approvals() -> None:
    asyncio.run(_test_itinerary_revision_invalidates_existing_approvals())


async def _test_itinerary_revision_invalidates_existing_approvals() -> None:
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
    trip = Trip(
        id=str(uuid.uuid4()), match_id=match.id, status="confirmed", itinerary_revision=3,
    )
    approval = TripApproval(
        id=str(uuid.uuid4()), trip_id=trip.id, user_id=user_a.id,
        itinerary_revision=3, status="approved",
    )

    async with sessions() as db:
        db.add_all([user_a, user_b, match, trip, approval])
        await db.commit()
        await itinerary_service._begin_new_revision(db, trip)
        await db.commit()

        assert trip.itinerary_revision == 4
        assert trip.status == "planning"
        historical = (await db.execute(select(TripApproval))).scalars().all()
        assert len(historical) == 1
        assert historical[0].itinerary_revision == 3
        current = await approval_service.get_state(db, trip, user_a.id)
        assert current.itinerary_revision == 4
        assert current.mine.status == "pending"

    await engine.dispose()


def test_approval_requires_an_itinerary_and_a_change_reason() -> None:
    asyncio.run(_test_approval_requires_an_itinerary())
    with pytest.raises(ValueError):
        ApprovalActionIn(action="change_request", comment="  ")


async def _test_approval_requires_an_itinerary() -> None:
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
    trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status="planning")

    async with sessions() as db:
        db.add_all([user_a, user_b, match, trip])
        await db.commit()
        with pytest.raises(HTTPException) as error:
            await approval_service.respond(
                db, trip.id, user_a.id, ApprovalActionIn(action="approve")
            )
        assert error.value.status_code == 409

    await engine.dispose()


def test_approval_routes_are_registered() -> None:
    from backend.app.main import app

    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert ("/api/trips/{trip_id}/approval", "GET") in routes
    assert ("/api/trips/{trip_id}/approval/me", "PUT") in routes
