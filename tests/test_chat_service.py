import asyncio
import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from backend.app.database import Base
from backend.app.models import Match, Trip, User
from backend.app.schemas.chat import ChatMessageCreate
from backend.app.services import chat_service


def _sqlite_test_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    @event.listens_for(engine.sync_engine, "connect")
    def register_postgres_compatibility_functions(dbapi_connection, _connection_record) -> None:
        dbapi_connection.create_function("least", 2, min, deterministic=True)
        dbapi_connection.create_function("greatest", 2, max, deterministic=True)

    return engine


def test_chat_flow_and_access_control() -> None:
    asyncio.run(_test_chat_flow_and_access_control())


async def _test_chat_flow_and_access_control() -> None:
    engine = _sqlite_test_engine()
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_a = User(id=str(uuid.uuid4()), nickname="A", tti_code="PNFH")
    user_b = User(id=str(uuid.uuid4()), nickname="B", tti_code="WCAS")
    outsider = User(id=str(uuid.uuid4()), nickname="C")
    match = Match(
        id=str(uuid.uuid4()),
        user_id=user_a.id,
        matched_user_id=user_b.id,
        match_level="완전 반대",
        recommendation_score=95,
    )
    trip = Trip(id=str(uuid.uuid4()), match_id=match.id, status="planning")

    async with session_factory() as db:
        db.add_all([user_a, user_b, outsider, match, trip])
        await db.commit()

        room = await chat_service.get_or_create_room(db, match.id, user_a.id)
        same_room = await chat_service.get_or_create_room(db, match.id, user_b.id)
        assert same_room.id == room.id
        assert room.counterpart.id == user_b.id
        assert same_room.counterpart.id == user_a.id
        assert room.trip and room.trip.id == trip.id

        with pytest.raises(HTTPException) as denied:
            await chat_service.get_room_detail(db, room.id, outsider.id)
        assert denied.value.status_code == 404

        body = ChatMessageCreate(
            client_message_id=str(uuid.uuid4()),
            content="  부산역에서 만날까요?  ",
        )
        message, _, created = await chat_service.create_message(db, room.id, user_a.id, body)
        assert created is True
        assert message.sequence == 1
        assert message.content == "부산역에서 만날까요?"

        duplicate, _, created_again = await chat_service.create_message(db, room.id, user_a.id, body)
        assert created_again is False
        assert duplicate.id == message.id

        assert await chat_service.get_total_unread_count(db, user_a.id) == 0
        assert await chat_service.get_total_unread_count(db, user_b.id) == 1

        read, _, changed = await chat_service.mark_read(db, room.id, user_b.id, message.sequence)
        assert changed is True
        assert read.last_read_sequence == 1
        assert await chat_service.get_total_unread_count(db, user_b.id) == 0
        room_for_a = await chat_service.get_room_detail(db, room.id, user_a.id)
        assert room_for_a.counterpart_last_read_sequence == 1

        # Read cursors never move backwards.
        read_again, _, changed_again = await chat_service.mark_read(db, room.id, user_b.id, 0)
        assert changed_again is False
        assert read_again.last_read_sequence == 1

        items, next_before = await chat_service.list_messages(
            db, room.id, user_a.id, before_sequence=None, limit=30
        )
        assert [item.id for item in items] == [message.id]
        assert next_before is None

    await engine.dispose()


def test_message_pagination_is_stable() -> None:
    asyncio.run(_test_message_pagination_is_stable())


async def _test_message_pagination_is_stable() -> None:
    engine = _sqlite_test_engine()
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_a = User(id=str(uuid.uuid4()), nickname="A")
    user_b = User(id=str(uuid.uuid4()), nickname="B")
    match = Match(
        id=str(uuid.uuid4()),
        user_id=user_a.id,
        matched_user_id=user_b.id,
        match_level="추천",
        recommendation_score=70,
        created_at=datetime.utcnow(),
    )

    async with session_factory() as db:
        db.add_all([user_a, user_b, match])
        await db.commit()
        room = await chat_service.get_or_create_room(db, match.id, user_a.id)

        sent = []
        for index in range(3):
            message, _, _ = await chat_service.create_message(
                db,
                room.id,
                user_a.id,
                ChatMessageCreate(client_message_id=str(uuid.uuid4()), content=f"message-{index + 1}"),
            )
            sent.append(message)

        newest, cursor = await chat_service.list_messages(
            db, room.id, user_b.id, before_sequence=None, limit=2
        )
        assert [item.sequence for item in newest] == [2, 3]
        assert cursor == 2

        older, final_cursor = await chat_service.list_messages(
            db, room.id, user_b.id, before_sequence=cursor, limit=2
        )
        assert [item.sequence for item in older] == [1]
        assert final_cursor is None

    await engine.dispose()


def test_chat_routes_are_registered() -> None:
    from backend.app.main import app

    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert ("/api/matches/{match_id}/chat-room", "POST") in routes
    assert ("/api/chat/rooms", "GET") in routes
    assert ("/api/chat/rooms/{room_id}/messages", "POST") in routes
    assert ("/api/chat/rooms/{room_id}/read", "PUT") in routes
    assert any(route.path == "/api/chat/ws" for route in app.routes)
