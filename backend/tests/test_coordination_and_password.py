import asyncio
from datetime import timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.database import Base
from app.models import (
    Match,
    PasswordResetToken,
    RefreshToken,
    Trip,
    User,
)
from app.schemas.coordination import ConcessionSubmissionIn, OddRuleProposalIn
from app.security import hash_password, utcnow, verify_password
from app.services import coordination_service, password_service


def run(coroutine):
    return asyncio.run(coroutine)


async def make_session(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")

    @event.listens_for(engine.sync_engine, "connect")
    def sqlite_pair_index_functions(connection, _record):
        # The production pair index uses PostgreSQL least/greatest. Register
        # deterministic equivalents so the same metadata can be tested on SQLite.
        connection.create_function("least", 2, min, deterministic=True)
        connection.create_function("greatest", 2, max, deterministic=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    return engine, factory()


async def seed_trip(db):
    first = User(
        id="user-1",
        email="one@example.com",
        nickname="첫째",
        password_hash=hash_password("password-one"),
    )
    second = User(
        id="user-2",
        email="two@example.com",
        nickname="둘째",
        password_hash=hash_password("password-two"),
    )
    match = Match(
        id="match-1",
        user_id=first.id,
        matched_user_id=second.id,
        match_level="완전 반대",
    )
    trip = Trip(id="trip-1", match_id=match.id, status="planning")
    db.add_all([first, second, match, trip])
    await db.commit()
    return first, second, trip


def complete_concessions(choice):
    return {
        "pace": choice,
        "budget": choice,
        "food": choice,
        "activities": choice,
    }


def test_concessions_stay_private_until_both_submit(tmp_path):
    async def scenario():
        engine, db = await make_session(tmp_path)
        try:
            first, second, trip = await seed_trip(db)
            first_state = await coordination_service.save_concessions(
                db,
                trip,
                first.id,
                ConcessionSubmissionIn(
                    answers=complete_concessions("keep"),
                    note="첫째의 비공개 메모",
                    submit=True,
                ),
            )
            assert first_state["mineSubmitted"] is True
            assert first_state["counterpart"] is None

            # The other person may see that a submission arrived, but not its
            # answers or note before submitting their own response.
            second_before = await coordination_service.get_concessions(
                db, trip, second.id
            )
            assert second_before["counterpartSubmitted"] is True
            assert second_before["counterpart"] is None
            assert "첫째의 비공개 메모" not in str(second_before)

            second_after = await coordination_service.save_concessions(
                db,
                trip,
                second.id,
                ConcessionSubmissionIn(
                    answers=complete_concessions("flexible"),
                    note="둘째의 메모",
                    submit=True,
                ),
            )
            assert second_after["bothSubmitted"] is True
            assert second_after["revealedAt"] is not None
            assert second_after["counterpart"]["note"] == "첫째의 비공개 메모"

            first_after = await coordination_service.get_concessions(
                db, trip, first.id
            )
            assert first_after["counterpart"]["note"] == "둘째의 메모"
            assert first_after["revealedAt"] == second_after["revealedAt"]

            with pytest.raises(HTTPException) as error:
                await coordination_service.save_concessions(
                    db,
                    trip,
                    first.id,
                    ConcessionSubmissionIn(
                        answers=complete_concessions("yield"), submit=True
                    ),
                )
            assert error.value.status_code == 409
        finally:
            await db.close()
            await engine.dispose()

    run(scenario())


def test_odd_rule_requires_counterpart_acceptance_and_versions_history(tmp_path):
    async def scenario():
        engine, db = await make_session(tmp_path)
        try:
            first, second, trip = await seed_trip(db)
            proposed = await coordination_service.propose_odd_rule(
                db,
                trip,
                first.id,
                OddRuleProposalIn(
                    rule_key="alternate-lead",
                    title="하루씩 주도권 바꾸기",
                    description="날짜마다 선택권을 번갈아 맡습니다.",
                ),
            )
            proposal_id = proposed["pending"][0]["id"]
            assert proposed["current"] is None

            with pytest.raises(HTTPException) as error:
                await coordination_service.respond_odd_rule(
                    db, trip, proposal_id, first.id, accept=True
                )
            assert error.value.status_code == 403

            replaced = await coordination_service.propose_odd_rule(
                db,
                trip,
                first.id,
                OddRuleProposalIn(
                    rule_key="one-must-each",
                    title="서로의 필수 한 가지 보장",
                    description="각자의 필수 선택 하나는 일정에 포함합니다.",
                ),
            )
            assert len(replaced["pending"]) == 1
            assert {row["status"] for row in replaced["proposals"]} == {
                "pending",
                "withdrawn",
            }
            proposal_id = replaced["pending"][0]["id"]

            first_version = await coordination_service.respond_odd_rule(
                db, trip, proposal_id, second.id, accept=True
            )
            assert first_version["current"]["version"] == 1
            assert first_version["current"]["respondedBy"] == second.id

            second_proposal = await coordination_service.propose_odd_rule(
                db,
                trip,
                second.id,
                OddRuleProposalIn(
                    rule_key="one-veto-each",
                    title="각자 거절권 한 번",
                    description="각자 한 번씩 선택을 제외할 수 있습니다.",
                ),
            )
            second_proposal_id = second_proposal["pending"][0]["id"]
            second_version = await coordination_service.respond_odd_rule(
                db, trip, second_proposal_id, first.id, accept=True
            )
            assert second_version["current"]["version"] == 2
            assert [row["version"] for row in second_version["history"]] == [2, 1]
            assert second_version["nextVersion"] == 3
        finally:
            await db.close()
            await engine.dispose()

    run(scenario())


def test_password_reset_is_single_use_expires_and_revokes_sessions(tmp_path, monkeypatch):
    async def scenario():
        engine, db = await make_session(tmp_path)
        try:
            first, _second, _trip = await seed_trip(db)
            db.add(
                RefreshToken(
                    user_id=first.id,
                    token_hash="a" * 64,
                    expires_at=utcnow() + timedelta(days=1),
                )
            )
            await db.commit()

            raw_token = await password_service.request_password_reset(
                db, "one@example.com"
            )
            assert raw_token is not None
            await password_service.reset_password(db, raw_token, "new-password-one")
            await db.refresh(first)
            assert verify_password("new-password-one", first.password_hash)

            reset_row = (
                await db.execute(select(PasswordResetToken))
            ).scalar_one()
            refresh_row = (await db.execute(select(RefreshToken))).scalar_one()
            assert reset_row.token_hash != raw_token
            assert len(reset_row.token_hash) == 64
            assert reset_row.used_at is not None
            assert refresh_row.revoked_at is not None

            with pytest.raises(HTTPException) as reused:
                await password_service.reset_password(
                    db, raw_token, "another-password"
                )
            assert reused.value.status_code == 400

            expiring_token = await password_service.request_password_reset(
                db, "one@example.com"
            )
            latest = (
                await db.execute(
                    select(PasswordResetToken)
                    .where(PasswordResetToken.used_at.is_(None))
                )
            ).scalar_one()
            latest.expires_at = utcnow() - timedelta(seconds=1)
            await db.commit()
            with pytest.raises(HTTPException) as expired:
                await password_service.reset_password(
                    db, expiring_token, "expired-password"
                )
            assert expired.value.status_code == 400
        finally:
            await db.close()
            await engine.dispose()

    monkeypatch.setattr(settings, "password_reset_debug", True)
    run(scenario())


def test_change_password_checks_current_password(tmp_path):
    async def scenario():
        engine, db = await make_session(tmp_path)
        try:
            first, _second, _trip = await seed_trip(db)
            refresh = RefreshToken(
                user_id=first.id,
                token_hash="b" * 64,
                expires_at=utcnow() + timedelta(days=1),
            )
            pending_reset = PasswordResetToken(
                user_id=first.id,
                token_hash="c" * 64,
                expires_at=utcnow() + timedelta(minutes=30),
            )
            db.add_all([refresh, pending_reset])
            await db.commit()
            with pytest.raises(HTTPException) as wrong:
                await password_service.change_password(
                    db, first, "wrong-password", "new-password-one"
                )
            assert wrong.value.status_code == 400
            assert refresh.revoked_at is None
            assert pending_reset.used_at is None

            await password_service.change_password(
                db, first, "password-one", "new-password-one"
            )
            await db.refresh(first)
            await db.refresh(refresh)
            await db.refresh(pending_reset)
            assert verify_password("new-password-one", first.password_hash)
            assert not verify_password("password-one", first.password_hash)
            assert refresh.revoked_at is not None
            assert pending_reset.used_at is not None
        finally:
            await db.close()
            await engine.dispose()

    run(scenario())
