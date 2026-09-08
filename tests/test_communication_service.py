import asyncio
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import ChatMessage, ChatRoom, Match, MatchRequest, Trip, User
from backend.app.schemas.chat import ChatMessageCreate, ChatReportIn
from backend.app.schemas.communication import MatchRequestCreate
from backend.app.services import chat_service, communication_service
from backend.app.services.chat_rate_limiter import ChatRateLimiter
from tests.test_chat_service import _sqlite_test_engine


def _tti_scores(sign: int) -> list[dict]:
    return [
        {"axis": "PW", "score": sign},
        {"axis": "NC", "score": sign},
        {"axis": "FA", "score": sign},
        {"axis": "HS", "score": sign},
    ]


def test_match_request_acceptance_provisions_chat_and_trip() -> None:
    asyncio.run(_test_match_request_acceptance_provisions_chat_and_trip())


async def _test_match_request_acceptance_provisions_chat_and_trip() -> None:
    engine = _sqlite_test_engine()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    requester = User(
        id=str(uuid.uuid4()), nickname="요청자", tti_code="PNFH", tti_scores_json=_tti_scores(-2)
    )
    receiver = User(
        id=str(uuid.uuid4()), nickname="수신자", tti_code="WCAS", tti_scores_json=_tti_scores(2)
    )
    async with sessions() as db:
        db.add_all([requester, receiver])
        await db.commit()
        request = await communication_service.create_match_request(
            db,
            requester,
            MatchRequestCreate(
                receiver_id=receiver.id,
                region="부산",
                start_date=date(2026, 9, 1),
                end_date=date(2026, 9, 3),
                greeting_message="같이 여행해요!",
            ),
        )
        accepted, match = await communication_service.accept_match_request(db, request.id, receiver)

        assert accepted.match_id == match.id
        assert accepted.user_ids == [requester.id, receiver.id]
        assert match.status == "active"
        assert match.user_tti_code_snapshot == requester.tti_code
        assert match.matched_user_tti_code_snapshot == receiver.tti_code
        assert (await db.get(MatchRequest, request.id)).status == "accepted"

        room = await db.get(ChatRoom, accepted.room_id)
        trip = await db.get(Trip, accepted.trip_id)
        assert room and room.next_sequence == 2
        assert trip and trip.region == "부산"
        first_message = (await db.execute(
            select(ChatMessage).where(ChatMessage.room_id == room.id, ChatMessage.sequence == 1)
        )).scalar_one()
        assert first_message.sender_id == requester.id
        assert first_message.content == "같이 여행해요!"

        with pytest.raises(HTTPException) as duplicate:
            await communication_service.create_match_request(
                db,
                requester,
                MatchRequestCreate(
                    receiver_id=receiver.id,
                    region="제주",
                    start_date=date(2026, 10, 1),
                    end_date=date(2026, 10, 2),
                    greeting_message="다시 요청",
                ),
            )
        assert duplicate.value.status_code == 409

    await engine.dispose()


def test_tti_is_required_for_match_request() -> None:
    asyncio.run(_test_tti_is_required_for_match_request())


async def _test_tti_is_required_for_match_request() -> None:
    engine = _sqlite_test_engine()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    requester = User(id=str(uuid.uuid4()), nickname="미완료")
    receiver = User(
        id=str(uuid.uuid4()), nickname="완료", tti_code="WCAS", tti_scores_json=_tti_scores(2)
    )
    async with sessions() as db:
        db.add_all([requester, receiver])
        await db.commit()
        with pytest.raises(HTTPException) as error:
            await communication_service.create_match_request(
                db,
                requester,
                MatchRequestCreate(
                    receiver_id=receiver.id,
                    region="부산",
                    start_date=date(2026, 9, 1),
                    end_date=date(2026, 9, 2),
                    greeting_message="안녕하세요",
                ),
            )
        assert error.value.status_code == 409
    await engine.dispose()


def test_message_delete_report_hide_and_block() -> None:
    asyncio.run(_test_message_delete_report_hide_and_block())


async def _test_message_delete_report_hide_and_block() -> None:
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
    async with sessions() as db:
        db.add_all([user_a, user_b, match])
        await db.commit()
        room = await chat_service.get_or_create_room(db, match.id, user_a.id)

        message, _, _ = await chat_service.create_message(
            db,
            room.id,
            user_a.id,
            ChatMessageCreate(client_message_id=str(uuid.uuid4()), content="신고 대상"),
        )
        report = await chat_service.report_message(
            db,
            room.id,
            message.id,
            user_b.id,
            ChatReportIn(reason="harassment", details="검토 필요"),
        )
        assert report.reported_user_id == user_a.id

        deleted, _, changed = await chat_service.delete_message(db, room.id, message.id, user_a.id)
        assert changed is True
        assert deleted.deleted is True
        assert deleted.content is None
        assert deleted.display_text == "삭제된 메시지입니다"
        stored = await db.get(ChatMessage, message.id)
        assert stored and stored.content == "신고 대상"

        await chat_service.hide_room(db, room.id, user_a.id)
        rooms, _ = await chat_service.list_rooms(db, user_a.id, status=None, before=None, limit=20)
        assert rooms == []
        other_rooms, _ = await chat_service.list_rooms(db, user_b.id, status=None, before=None, limit=20)
        assert len(other_rooms) == 1

        block, ended = await communication_service.block_user(db, user_b, user_a.id)
        assert block.blocked_user_id == user_a.id
        assert len(ended) == 1
        listed_blocks = await communication_service.list_blocks(db, user_b.id)
        assert len(listed_blocks) == 1
        assert listed_blocks[0].user.id == user_a.id
        assert (await db.get(Match, match.id)).status == "ended"
        blocker_rooms, _ = await chat_service.list_rooms(db, user_b.id, status=None, before=None, limit=20)
        assert blocker_rooms == []
        with pytest.raises(HTTPException) as send_error:
            await chat_service.create_message(
                db,
                room.id,
                user_a.id,
                ChatMessageCreate(client_message_id=str(uuid.uuid4()), content="전송 불가"),
            )
        assert send_error.value.status_code == 409

        assert (await db.execute(select(func.count(ChatMessage.id)))).scalar_one() >= 1
    await engine.dispose()


def test_rate_limiter_rejects_sixth_immediate_message() -> None:
    async def scenario() -> None:
        limiter = ChatRateLimiter()
        for _ in range(5):
            await limiter.check("user-id")
        with pytest.raises(HTTPException) as error:
            await limiter.check("user-id")
        assert error.value.status_code == 429
        assert error.value.headers == {"Retry-After": "1"}

    asyncio.run(scenario())


def test_communication_routes_are_registered() -> None:
    from backend.app.main import app

    routes = {(route.path, method) for route in app.routes for method in getattr(route, "methods", set())}
    assert ("/api/match-requests", "POST") in routes
    assert ("/api/match-requests/{request_id}/accept", "POST") in routes
    assert ("/api/matches/{match_id}/end", "POST") in routes
    assert ("/api/me/matches/{match_id}", "DELETE") in routes
    assert ("/api/users/{user_id}/block", "POST") in routes
    assert ("/api/me/blocks", "GET") in routes
    assert ("/api/chat/rooms/{room_id}/messages/{message_id}", "DELETE") in routes
    assert ("/api/chat/rooms/{room_id}/messages/{message_id}/reports", "POST") in routes
