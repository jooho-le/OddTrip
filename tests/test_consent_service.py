import asyncio
import time
import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app import legal
from backend.app.database import Base
from backend.app.models import User, UserConsent
from backend.app.schemas.consent import ConsentDecisionIn
from backend.app.services import consent_service, match_service
from tests.test_chat_service import _sqlite_test_engine


def _decision(consent_type: str, accepted: bool = True, version: str | None = None) -> ConsentDecisionIn:
    return ConsentDecisionIn(
        type=consent_type,
        version=version or legal.CURRENT_VERSIONS[consent_type],
        accepted=accepted,
    )


def _registration_decisions(marketing: bool = False) -> list[ConsentDecisionIn]:
    decisions = [_decision(t) for t in legal.REGISTRATION_REQUIRED]
    decisions.append(_decision(legal.MARKETING, accepted=marketing))
    return decisions


async def _session_factory():
    engine = _sqlite_test_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def test_registration_consent_validation() -> None:
    """필수 동의가 가입을 성립시키므로, 버튼 비활성화가 아니라 여기서 막습니다."""
    # 동의를 하나도 보내지 않은 가입 요청.
    with pytest.raises(HTTPException) as missing:
        consent_service.validate(
            [],
            source=legal.SOURCE_SIGNUP,
            allowed=legal.REGISTRATION_TYPES,
            required=legal.REGISTRATION_REQUIRED,
        )
    assert missing.value.status_code == 400

    # 필수 항목 하나가 빠진 경우.
    partial = [_decision(t) for t in legal.REGISTRATION_REQUIRED if t != legal.TERMS]
    with pytest.raises(HTTPException):
        consent_service.validate(
            partial,
            source=legal.SOURCE_SIGNUP,
            allowed=legal.REGISTRATION_TYPES,
            required=legal.REGISTRATION_REQUIRED,
        )

    # 선택 항목만 거부한 경우는 통과해야 합니다.
    consent_service.validate(
        _registration_decisions(marketing=False),
        source=legal.SOURCE_SIGNUP,
        allowed=legal.REGISTRATION_TYPES,
        required=legal.REGISTRATION_REQUIRED,
    )


def test_stale_version_is_rejected() -> None:
    """지난 버전을 렌더링한 클라이언트가 현행 동의로 기록되면 안 됩니다."""
    with pytest.raises(HTTPException) as stale:
        consent_service.validate(
            [_decision(legal.TERMS, version="draft-1999-01-01")],
            source=legal.SOURCE_SIGNUP,
            allowed=legal.REGISTRATION_TYPES,
        )
    assert stale.value.status_code == 400
    assert "갱신" in stale.value.detail


def test_only_revocable_consents_can_be_withdrawn() -> None:
    consent_service.validate(
        [_decision(legal.MARKETING, accepted=False)], source=legal.SOURCE_SETTINGS
    )

    with pytest.raises(HTTPException) as refused:
        consent_service.validate(
            [_decision(legal.TERMS, accepted=False)], source=legal.SOURCE_SETTINGS
        )
    assert refused.value.status_code == 400

    # 매칭 게이트도 철회 대상이 아닙니다. 프로필 공개를 멈추는 경로는
    # 별도 기능이지 동의 이력을 뒤집는 방식이 아닙니다.
    with pytest.raises(HTTPException):
        consent_service.validate(
            [_decision(legal.MATCHING_PROFILE, accepted=False)], source=legal.SOURCE_SETTINGS
        )


def test_unknown_type_and_duplicates_are_rejected() -> None:
    with pytest.raises(HTTPException):
        consent_service.validate(
            [ConsentDecisionIn(type="nonsense", version="x", accepted=True)],
            source=legal.SOURCE_SETTINGS,
        )

    with pytest.raises(HTTPException):
        consent_service.validate(
            [_decision(legal.MARKETING), _decision(legal.MARKETING)],
            source=legal.SOURCE_SETTINGS,
        )

    with pytest.raises(HTTPException):
        consent_service.validate([_decision(legal.MARKETING)], source="somewhere-else")

    # 가입 화면에서는 매칭 게이트를 받을 수 없습니다.
    with pytest.raises(HTTPException):
        consent_service.validate(
            [_decision(legal.MATCHING_PROFILE)],
            source=legal.SOURCE_SIGNUP,
            allowed=legal.REGISTRATION_TYPES,
        )


def test_withdrawal_appends_instead_of_editing() -> None:
    asyncio.run(_test_withdrawal_appends_instead_of_editing())


async def _test_withdrawal_appends_instead_of_editing() -> None:
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(id=user_id, nickname="여행자"))
        await session.commit()

        await consent_service.record(
            session, user_id, _registration_decisions(marketing=True), legal.SOURCE_SIGNUP
        )
        status = await consent_service.status(session, user_id)
        marketing = next(item for item in status.items if item.type == legal.MARKETING)
        assert marketing.accepted is True

        # 시스템 시계가 거칠어서(Windows 약 15ms) 연속 기록이 같은 시각을 받습니다.
        # 아래 순서 검증은 진짜 순서를 보려는 것이므로 한 틱을 띄웁니다.
        time.sleep(0.05)
        await consent_service.record(
            session,
            user_id,
            [_decision(legal.MARKETING, accepted=False)],
            legal.SOURCE_SETTINGS,
        )

        status = await consent_service.status(session, user_id)
        marketing = next(item for item in status.items if item.type == legal.MARKETING)
        assert marketing.accepted is False

        # 철회했다고 해서 동의했던 사실이 사라지면 안 됩니다.
        rows = await session.execute(
            select(func.count())
            .select_from(UserConsent)
            .where(UserConsent.user_id == user_id, UserConsent.consent_type == legal.MARKETING)
        )
        assert rows.scalar_one() == 2

        history = await consent_service.history(session, user_id)
        assert [item.accepted for item in history if item.type == legal.MARKETING] == [False, True]


def test_consent_goes_stale_when_the_document_changes() -> None:
    asyncio.run(_test_consent_goes_stale_when_the_document_changes())


async def _test_consent_goes_stale_when_the_document_changes() -> None:
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(id=user_id, nickname="여행자"))
        await session.commit()
        await consent_service.record(
            session, user_id, [_decision(legal.TERMS)], legal.SOURCE_SIGNUP
        )
        assert await consent_service.has_accepted(session, user_id, legal.TERMS) is True

        original = legal.CURRENT_VERSIONS[legal.TERMS]
        legal.CURRENT_VERSIONS[legal.TERMS] = "draft-2027-01-01"
        try:
            # 문서가 바뀌면 예전 동의는 현행 동의가 아닙니다.
            assert await consent_service.has_accepted(session, user_id, legal.TERMS) is False
            status = await consent_service.status(session, user_id)
            terms = next(item for item in status.items if item.type == legal.TERMS)
            assert terms.accepted is False
            assert terms.stale is True
            assert terms.version == original
        finally:
            legal.CURRENT_VERSIONS[legal.TERMS] = original


def test_candidates_without_profile_consent_are_not_listed() -> None:
    asyncio.run(_test_candidates_without_profile_consent_are_not_listed())


async def _test_candidates_without_profile_consent_are_not_listed() -> None:
    sessions = await _session_factory()

    def _scores(sign: int) -> list[dict]:
        return [{"axis": axis, "score": sign} for axis in ("PW", "NC", "FA", "HS")]

    viewer = User(id=str(uuid.uuid4()), nickname="보는사람", tti_code="PNFH", tti_scores_json=_scores(-2))
    consented = User(id=str(uuid.uuid4()), nickname="동의함", tti_code="WCAS", tti_scores_json=_scores(2))
    silent = User(id=str(uuid.uuid4()), nickname="미동의", tti_code="WCAS", tti_scores_json=_scores(2))

    async with sessions() as session:
        session.add_all([viewer, consented, silent])
        await session.commit()

        await consent_service.record(
            session, consented.id, [_decision(legal.MATCHING_PROFILE)], legal.SOURCE_MATCHING_GATE
        )

        candidates = await match_service.find_matches(session, viewer)
        listed = {candidate.id for candidate in candidates}
        assert consented.id in listed
        # 동의하지 않은 사람의 프로필은 애초에 조회되지 않습니다.
        assert silent.id not in listed


def test_same_timestamp_tie_resolves_to_withdrawal() -> None:
    asyncio.run(_test_same_timestamp_tie_resolves_to_withdrawal())


async def _test_same_timestamp_tie_resolves_to_withdrawal() -> None:
    """같은 틱에 동의와 철회가 들어오면 어느 쪽이 최신인지 정할 수 없습니다.

    이때는 철회로 읽어야 합니다. 애매한 기록을 동의로 간주하면 받지 않은
    동의를 받았다고 보는 셈이 됩니다.
    """
    sessions = await _session_factory()
    user_id = str(uuid.uuid4())

    async with sessions() as session:
        session.add(User(id=user_id, nickname="여행자"))
        await session.commit()

        at = datetime.utcnow()
        session.add_all([
            consent_service.build(
                user_id=user_id,
                decision=_decision(legal.MARKETING, accepted=True),
                source=legal.SOURCE_SIGNUP,
                at=at,
            ),
            consent_service.build(
                user_id=user_id,
                decision=_decision(legal.MARKETING, accepted=False),
                source=legal.SOURCE_SETTINGS,
                at=at,
            ),
        ])
        await session.commit()

        status = await consent_service.status(session, user_id)
        marketing = next(item for item in status.items if item.type == legal.MARKETING)
        assert marketing.accepted is False
        assert await consent_service.has_accepted(session, user_id, legal.MARKETING) is False
