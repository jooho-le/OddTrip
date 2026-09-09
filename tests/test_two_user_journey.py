"""Two-account integration test for the matching, chat and coordination boundary."""

import asyncio
import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import ChatRoom, Match, Trip, User
from backend.app.schemas.chat import ChatMessageCreate
from backend.app.schemas.communication import MatchRequestCreate
from backend.app.services import chat_service, communication_service, decision_service
from tests.test_chat_service import _sqlite_test_engine


def test_two_users_complete_matching_chat_and_preference_agreement() -> None:
    asyncio.run(_two_user_journey())


async def _two_user_journey() -> None:
    engine = _sqlite_test_engine()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    user_a = User(
        id=str(uuid.uuid4()), nickname="계획형", tti_code="PNFH",
        tti_scores_json=[{"axis": axis, "score": -2} for axis in ("PW", "NC", "FA", "HS")],
    )
    user_b = User(
        id=str(uuid.uuid4()), nickname="즉흥형", tti_code="WCAS",
        tti_scores_json=[{"axis": axis, "score": 2} for axis in ("PW", "NC", "FA", "HS")],
    )

    async with sessions() as db:
        db.add_all([user_a, user_b])
        await db.commit()

        request = await communication_service.create_match_request(
            db, user_a, MatchRequestCreate(
                receiver_id=user_b.id,
                region="부산",
                start_date=date(2026, 10, 1),
                end_date=date(2026, 10, 3),
                greeting_message="같이 여행해요.",
            ),
        )
        accepted, match = await communication_service.accept_match_request(db, request.id, user_b)
        trip = await db.get(Trip, accepted.trip_id)
        room = await db.get(ChatRoom, accepted.room_id)
        assert trip and room and match.status == "active"

        first_reply, _, created = await chat_service.create_message(
            db, room.id, user_b.id,
            ChatMessageCreate(client_message_id=str(uuid.uuid4()), content="좋아요. 선호를 입력할게요."),
        )
        assert created is True
        assert first_reply.sequence == 2  # sequence 1 is the match-request greeting

        await decision_service.update_personal_preferences(db, trip, user_a.id, {
            "places": ["시장", "바다"], "activities": ["산책"], "foods": ["한식"],
            "pace": 70, "budget": 40, "indoorPreferred": False, "hiddenSpots": True,
        })
        await decision_service.update_personal_preferences(db, trip, user_b.id, {
            "places": ["바다", "미술관"], "activities": ["공연"], "foods": ["양식"],
            "pace": 40, "budget": 60, "indoorPreferred": True, "hiddenSpots": False,
        })
        pair = await decision_service.get_pair_preferences(db, trip, user_a.id)
        assert pair["bothSubmitted"] is True
        assert pair["comparison"]["places"]["common"] == ["바다"]

        proposal = await decision_service.create_preference_proposal(db, trip, user_a.id, {
            "places": ["바다", "시장"], "activities": ["산책"], "foods": ["한식", "양식"],
            "pace": 55, "budget": 50, "indoorPreferred": True, "hiddenSpots": True,
            "title": "둘이 가는 부산", "region": "부산", "dateFrom": "2026-10-01", "dateTo": "2026-10-03",
        })
        with pytest.raises(HTTPException) as self_accept:
            await decision_service.respond_to_preference_proposal(
                db, trip, proposal["id"], user_a.id, accept=True
            )
        assert self_accept.value.status_code == 403

        result = await decision_service.respond_to_preference_proposal(
            db, trip, proposal["id"], user_b.id, accept=True
        )
        assert result["status"] == "accepted"
        assert trip.preferences_json["pace"] == 55
        assert trip.title == "둘이 가는 부산"
        assert (await decision_service.get_pair_preferences(db, trip, user_b.id))["agreed"]["places"] == ["바다", "시장"]

        with pytest.raises(HTTPException) as duplicate_response:
            await decision_service.respond_to_preference_proposal(
                db, trip, proposal["id"], user_b.id, accept=False
            )
        assert duplicate_response.value.status_code == 409
        assert (await db.get(Match, match.id)).status == "active"

    await engine.dispose()
