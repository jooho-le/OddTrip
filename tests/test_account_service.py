import asyncio
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app import legal
from backend.app.database import Base
from backend.app.models import (
    Match,
    MatchRequest,
    Notification,
    RefreshToken,
    User,
    UserConsent,
)
from backend.app.schemas.communication import MatchRequestCreate
from backend.app.services import account_service, communication_service, consent_service
from backend.app.schemas.consent import ConsentDecisionIn
from tests.test_chat_service import _sqlite_test_engine


def _scores(sign: int) -> list[dict]:
    return [{"axis": axis, "score": sign} for axis in ("PW", "NC", "FA", "HS")]


async def _session_factory():
    engine = _sqlite_test_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def _consent(consent_type: str) -> ConsentDecisionIn:
    return ConsentDecisionIn(type=consent_type, version=legal.CURRENT_VERSIONS[consent_type], accepted=True)


def test_withdrawal_erases_identity_and_frees_the_email() -> None:
    asyncio.run(_test_withdrawal_erases_identity_and_frees_the_email())


async def _test_withdrawal_erases_identity_and_frees_the_email() -> None:
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(
            id=user_id,
            email="leaver@example.com",
            password_hash="hashed",
            nickname="떠나는사람",
            avatar_url="https://example.com/a.png",
            home_region="부산",
            tti_code="WCAS",
            tti_scores_json=_scores(2),
        ))
        await session.commit()

        user = await session.get(User, user_id)
        await account_service.withdraw(session, user)

        closed = await session.get(User, user_id)
        assert closed.deleted_at is not None
        assert closed.deleted_by == user_id
        assert closed.nickname == account_service.ANONYMIZED_NICKNAME
        # 식별정보가 실제로 지워져야 합니다. 행이 남는 것과 정보가 남는 것은 다릅니다.
        assert closed.email is None
        assert closed.password_hash is None
        assert closed.avatar_url is None
        assert closed.home_region is None
        assert closed.tti_code is None
        assert closed.tti_scores_json is None

        # 이메일이 NULL이 되었으므로 같은 주소로 다시 가입할 수 있습니다.
        # unique 제약은 NULL을 중복으로 보지 않습니다.
        session.add(User(id=str(uuid.uuid4()), email="leaver@example.com", nickname="돌아온사람"))
        await session.commit()


def test_withdrawal_revokes_every_session() -> None:
    asyncio.run(_test_withdrawal_revokes_every_session())


async def _test_withdrawal_revokes_every_session() -> None:
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(id=user_id, email="leaver@example.com", nickname="떠나는사람"))
        session.add_all([
            RefreshToken(
                id=str(uuid.uuid4()),
                user_id=user_id,
                token_hash=f"hash-{index}",
                expires_at=datetime.utcnow() + timedelta(days=14),
            )
            for index in range(3)
        ])
        await session.commit()

        await account_service.withdraw(session, await session.get(User, user_id))

        tokens = (await session.execute(
            select(RefreshToken).where(RefreshToken.user_id == user_id)
        )).scalars().all()
        # 살아있는 세션이 하나라도 남으면 탈퇴한 계정으로 계속 요청할 수 있습니다.
        assert all(token.revoked_at is not None for token in tokens)


def test_withdrawal_ends_matches_and_notifies_the_counterpart() -> None:
    asyncio.run(_test_withdrawal_ends_matches_and_notifies_the_counterpart())


async def _test_withdrawal_ends_matches_and_notifies_the_counterpart() -> None:
    sessions = await _session_factory()

    leaver = User(id=str(uuid.uuid4()), email="a@example.com", nickname="떠나는사람", tti_code="PNFH", tti_scores_json=_scores(-2))
    partner = User(id=str(uuid.uuid4()), email="b@example.com", nickname="남는사람", tti_code="WCAS", tti_scores_json=_scores(2))

    async with sessions() as session:
        session.add_all([leaver, partner])
        await session.commit()

        for user in (leaver, partner):
            await consent_service.record(
                session, user.id, [_consent(legal.MATCHING_PROFILE)], legal.SOURCE_MATCHING_GATE
            )

        request = await communication_service.create_match_request(
            session,
            leaver,
            MatchRequestCreate(
                receiver_id=partner.id,
                region="부산",
                start_date=date(2026, 10, 1),
                end_date=date(2026, 10, 3),
                greeting_message="같이 가요",
            ),
        )
        await communication_service.accept_match_request(session, request.id, partner)

        await account_service.withdraw(session, await session.get(User, leaver.id))

        match = (await session.execute(select(Match))).scalars().one()
        assert match.status == "ended"
        assert match.ended_at is not None

        notifications = (await session.execute(
            select(Notification).where(Notification.user_id == partner.id)
        )).scalars().all()
        ended = [item for item in notifications if item.type == "match.ended"]
        assert len(ended) == 1
        # 탈퇴 사실만 알리고 누가 떠났는지는 담지 않습니다.
        assert "탈퇴" in ended[0].body
        assert "떠나는사람" not in ended[0].body


def test_withdrawal_closes_out_pending_requests() -> None:
    asyncio.run(_test_withdrawal_closes_out_pending_requests())


async def _test_withdrawal_closes_out_pending_requests() -> None:
    sessions = await _session_factory()

    leaver = User(id=str(uuid.uuid4()), email="a@example.com", nickname="떠나는사람", tti_code="PNFH", tti_scores_json=_scores(-2))
    sent_to = User(id=str(uuid.uuid4()), email="b@example.com", nickname="받는사람", tti_code="WCAS", tti_scores_json=_scores(2))
    asked_by = User(id=str(uuid.uuid4()), email="c@example.com", nickname="보낸사람", tti_code="WCAS", tti_scores_json=_scores(2))

    async with sessions() as session:
        session.add_all([leaver, sent_to, asked_by])
        await session.commit()

        for user in (leaver, sent_to, asked_by):
            await consent_service.record(
                session, user.id, [_consent(legal.MATCHING_PROFILE)], legal.SOURCE_MATCHING_GATE
            )

        outgoing = await communication_service.create_match_request(
            session,
            leaver,
            MatchRequestCreate(
                receiver_id=sent_to.id,
                region="부산",
                start_date=date(2026, 10, 1),
                end_date=date(2026, 10, 3),
                greeting_message="같이 가요",
            ),
        )
        incoming = await communication_service.create_match_request(
            session,
            asked_by,
            MatchRequestCreate(
                receiver_id=leaver.id,
                region="서울",
                start_date=date(2026, 11, 1),
                end_date=date(2026, 11, 3),
                greeting_message="함께해요",
            ),
        )

        await account_service.withdraw(session, await session.get(User, leaver.id))

        # 보낸 요청은 거둔 것으로, 받은 요청은 거절한 것으로 남습니다. 남겨두면
        # 상대 받은함에서 만료될 때까지 살아 있고, 수락하면 닫힌 계정과 매칭됩니다.
        assert (await session.get(MatchRequest, outgoing.id)).status == "cancelled"
        assert (await session.get(MatchRequest, incoming.id)).status == "rejected"


def test_withdrawal_keeps_the_consent_ledger() -> None:
    asyncio.run(_test_withdrawal_keeps_the_consent_ledger())


async def _test_withdrawal_keeps_the_consent_ledger() -> None:
    """약관 제24조③이 분쟁 처리에 필요한 자료를 보존 대상으로 둡니다.

    동의 이력은 "이 사람이 무엇에 동의하고 가입했는가"의 증빙이라 탈퇴로
    사라지면 안 됩니다.
    """
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(id=user_id, email="leaver@example.com", nickname="떠나는사람"))
        await session.commit()

        await consent_service.record(
            session,
            user_id,
            [_consent(consent_type) for consent_type in legal.REGISTRATION_REQUIRED],
            legal.SOURCE_SIGNUP,
        )

        await account_service.withdraw(session, await session.get(User, user_id))

        rows = (await session.execute(
            select(UserConsent).where(UserConsent.user_id == user_id)
        )).scalars().all()
        assert len(rows) == len(legal.REGISTRATION_REQUIRED)
