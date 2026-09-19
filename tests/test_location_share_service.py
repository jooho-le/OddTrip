import asyncio
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.app.database import Base
from backend.app.models import LocationShare, Match, Trip, User
from backend.app.realtime.location_cache import Position, location_cache
from backend.app.schemas.location_share import (
    LocationPing,
    LocationShareCreate,
    LocationShareExtend,
)
from backend.app.services import location_share_service


def _session_factory():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def register_postgres_compatibility_functions(dbapi_connection, _connection_record) -> None:
        dbapi_connection.create_function("least", 2, min, deterministic=True)
        dbapi_connection.create_function("greatest", 2, max, deterministic=True)

    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def _users(db):
    first = User(id=str(uuid.uuid4()), nickname="도윤", tti_code="WCAS")
    second = User(id=str(uuid.uuid4()), nickname="서아", tti_code="PNFH")
    db.add_all([first, second])
    await db.commit()
    return first, second


def _create(hours: int = 6, trip_id: str | None = None) -> LocationShareCreate:
    return LocationShareCreate(trip_id=trip_id, duration_hours=hours, consent=True)


def test_share_link_lifecycle() -> None:
    asyncio.run(_test_share_link_lifecycle())


async def _test_share_link_lifecycle() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, _ = await _users(db)

        assert await location_share_service.get_active_out(db, owner) is None

        share = await location_share_service.start(db, owner, _create(6))
        assert len(share.token) >= 24
        assert share.display_name == "도윤"
        assert share.view_count == 0 and share.last_position_at is None

        # 링크를 받은 사람은 로그인하지 않는다. 아직 좌표가 없으면 기다리는 중이다.
        waiting = await location_share_service.view(db, share.token)
        assert waiting.status == "waiting"
        assert waiting.latitude is None
        # 여행·동행 정보는 어떤 경우에도 담기지 않는다.
        assert not hasattr(waiting, "trip_id")

        await location_share_service.ping(db, owner, share.id, LocationPing(latitude=37.5, longitude=127.0, accuracy=12.5))
        live = await location_share_service.view(db, share.token)
        assert live.status == "live"
        assert (live.latitude, live.longitude) == (37.5, 127.0)
        assert live.display_name == "도윤"

        # 열람 횟수는 소유자 화면에 그대로 보인다.
        assert (await location_share_service.get_active_out(db, owner)).view_count == 2

        await location_share_service.stop(db, owner, share.id)
        ended = await location_share_service.view(db, share.token)
        assert ended.status == "ended"
        # 끈 뒤에는 좌표를 돌려주지 않는다.
        assert ended.latitude is None
        assert await location_share_service.get_active_out(db, owner) is None

    await engine.dispose()


def test_starting_again_closes_the_previous_link() -> None:
    asyncio.run(_test_starting_again_closes_the_previous_link())


async def _test_starting_again_closes_the_previous_link() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, _ = await _users(db)

        first = await location_share_service.start(db, owner, _create(6))
        second = await location_share_service.start(db, owner, _create(24))

        # 사용자가 모르는 주소가 계속 열려 있으면 안 된다.
        assert (await location_share_service.view(db, first.token)).status == "ended"
        assert (await location_share_service.view(db, second.token)).status == "waiting"
        assert (await location_share_service.get_active_out(db, owner)).id == second.id

    await engine.dispose()


def test_expired_link_stops_answering_and_can_be_extended_before_that() -> None:
    asyncio.run(_test_expired_link_stops_answering_and_can_be_extended_before_that())


async def _test_expired_link_stops_answering_and_can_be_extended_before_that() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, _ = await _users(db)
        share = await location_share_service.start(db, owner, _create(6))

        extended = await location_share_service.extend(db, owner, share.id, LocationShareExtend(duration_hours=24))
        assert extended.expires_at > share.expires_at

        # 시간이 지나면 사용자가 아무것도 하지 않아도 링크가 닫힌다.
        row = (await db.execute(select(LocationShare).where(LocationShare.id == share.id))).scalar_one()
        row.expires_at = datetime.utcnow() - timedelta(minutes=1)
        await db.commit()

        assert (await location_share_service.view(db, share.token)).status == "ended"
        assert await location_share_service.get_active_out(db, owner) is None
        with pytest.raises(HTTPException) as closed:
            await location_share_service.ping(db, owner, share.id, LocationPing(latitude=37.5, longitude=127.0))
        assert closed.value.status_code == 409

    await engine.dispose()


def test_only_the_owner_can_touch_the_share() -> None:
    asyncio.run(_test_only_the_owner_can_touch_the_share())


async def _test_only_the_owner_can_touch_the_share() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, stranger = await _users(db)
        share = await location_share_service.start(db, owner, _create(6))

        for call in (
            location_share_service.ping(db, stranger, share.id, LocationPing(latitude=1, longitude=1)),
            location_share_service.stop(db, stranger, share.id),
            location_share_service.extend(db, stranger, share.id, LocationShareExtend(duration_hours=6)),
        ):
            with pytest.raises(HTTPException) as denied:
                await call
            assert denied.value.status_code == 404

        # 남의 공유는 내 현재 공유로도 잡히지 않는다.
        assert await location_share_service.get_active_out(db, stranger) is None

    await engine.dispose()


def test_refuses_to_start_without_consent_and_checks_the_trip() -> None:
    asyncio.run(_test_refuses_to_start_without_consent_and_checks_the_trip())


async def _test_refuses_to_start_without_consent_and_checks_the_trip() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, partner = await _users(db)
        match = Match(
            id=str(uuid.uuid4()), user_id=owner.id, matched_user_id=partner.id,
            match_level="완전 반대", recommendation_score=95,
        )
        trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status="confirmed")
        db.add_all([match, trip])
        await db.commit()

        with pytest.raises(HTTPException) as refused:
            await location_share_service.start(
                db, owner, LocationShareCreate(duration_hours=6, consent=False)
            )
        assert refused.value.status_code == 400

        linked = await location_share_service.start(db, owner, _create(6, trip_id=trip.id))
        assert linked.trip_id == trip.id

        # 참여하지 않은 여행으로는 켤 수 없다.
        outsider = User(id=str(uuid.uuid4()), nickname="제삼자")
        db.add(outsider)
        await db.commit()
        with pytest.raises(HTTPException) as denied:
            await location_share_service.start(db, outsider, _create(6, trip_id=trip.id))
        assert denied.value.status_code == 404

    await engine.dispose()


def test_unknown_token_is_not_found() -> None:
    asyncio.run(_test_unknown_token_is_not_found())


async def _test_unknown_token_is_not_found() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        with pytest.raises(HTTPException) as missing:
            await location_share_service.view(db, "not-a-real-token")
        assert missing.value.status_code == 404

    await engine.dispose()


def test_a_stopped_feed_still_shows_the_last_place_but_says_it_stopped() -> None:
    asyncio.run(_test_a_stopped_feed_still_shows_the_last_place_but_says_it_stopped())


async def _test_a_stopped_feed_still_shows_the_last_place_but_says_it_stopped() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, _ = await _users(db)
        share = await location_share_service.start(db, owner, _create(6))

        # 3분 전 좌표. 지하철에 들어갔거나 화면이 꺼진 상태다. 마지막 위치는
        # 그대로 보여 주되 실시간이라고 말하지 않는다.
        location_cache.put(
            share.id,
            Position(latitude=37.5, longitude=127.0, accuracy=10.0, at=datetime.utcnow() - timedelta(minutes=3)),
        )
        stalled = await location_share_service.view(db, share.token)
        assert stalled.status == "stale"
        assert (stalled.latitude, stalled.longitude) == (37.5, 127.0)

        # 방금 들어온 좌표로 바뀌면 다시 실시간이다.
        await location_share_service.ping(db, owner, share.id, LocationPing(latitude=37.6, longitude=127.1))
        assert (await location_share_service.view(db, share.token)).status == "live"

    await engine.dispose()


def test_a_long_silence_drops_the_last_place_too() -> None:
    asyncio.run(_test_a_long_silence_drops_the_last_place_too())


async def _test_a_long_silence_drops_the_last_place_too() -> None:
    engine, session_factory = _session_factory()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        owner, _ = await _users(db)
        share = await location_share_service.start(db, owner, _create(6))
        location_cache.put(
            share.id,
            Position(latitude=37.5, longitude=127.0, accuracy=10.0, at=datetime.utcnow() - timedelta(minutes=30)),
        )
        # 오래 멈춰 있으면 마지막 위치도 들고 있지 않는다. 위치는 오래 보관할수록
        # 위험한 자료다.
        row = (await db.execute(select(LocationShare).where(LocationShare.id == share.id))).scalar_one()
        row.created_at = datetime.utcnow() - timedelta(hours=1)
        await db.commit()

        lost = await location_share_service.view(db, share.token)
        assert lost.status == "lost"
        assert lost.latitude is None

    await engine.dispose()
