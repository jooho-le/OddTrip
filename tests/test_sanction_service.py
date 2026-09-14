import asyncio
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import Notification, Sanction, User
from backend.app.services import sanction_service
from tests.test_chat_service import _sqlite_test_engine


async def _session_factory():
    engine = _sqlite_test_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def _user(email: str, *, role: str = "user") -> User:
    return User(
        id=str(uuid.uuid4()),
        email=email,
        nickname=email.split("@")[0],
        role=role,
        created_at=datetime.utcnow(),
    )


async def _pair(session):
    member, admin = _user("member@example.com"), _user("ops@example.com", role="admin")
    session.add_all([member, admin])
    await session.commit()
    return member, admin


def test_suspension_blocks_and_expires() -> None:
    asyncio.run(_test_suspension_blocks_and_expires())


async def _test_suspension_blocks_and_expires() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        assert sanction_service.is_suspended(member) is False

        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="harassment", note="반복 괴롭힘", days=7,
        )
        assert sanction_service.is_suspended(member) is True
        assert sanction_service.account_status(member) == "suspended"
        # 정지는 매칭도 함께 막는다. 계정을 못 쓰는데 매칭만 열려 있을 수 없다.
        assert sanction_service.is_matching_restricted(member) is True

        # 만료 뒤에는 스스로 풀린다. 별도 배치가 필요 없다.
        later = datetime.utcnow() + timedelta(days=8)
        assert sanction_service.is_suspended(member, later) is False


def test_ban_never_expires() -> None:
    asyncio.run(_test_ban_never_expires())


async def _test_ban_never_expires() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.BAN, reason="fraud",
        )
        far_future = datetime.utcnow() + timedelta(days=3650)
        assert sanction_service.is_suspended(member, far_future) is True


def test_matching_restriction_leaves_the_rest_of_the_service_open() -> None:
    asyncio.run(_test_matching_restriction_leaves_the_rest_of_the_service_open())


async def _test_matching_restriction_leaves_the_rest_of_the_service_open() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.MATCHING_RESTRICTION,
            reason="spam", days=3,
        )
        assert sanction_service.is_matching_restricted(member) is True
        # 매칭만 막는 조치이므로 로그인과 나머지 기능은 살아 있어야 한다.
        assert sanction_service.is_suspended(member) is False
        assert sanction_service.account_status(member) == "active"


def test_a_shorter_sanction_cannot_shorten_a_longer_one() -> None:
    asyncio.run(_test_a_shorter_sanction_cannot_shorten_a_longer_one())


async def _test_a_shorter_sanction_cannot_shorten_a_longer_one() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="harassment", days=30,
        )
        long_until = member.suspended_until

        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="spam", days=1,
        )
        # 짧은 제재를 나중에 부과해 앞선 제재를 실질적으로 푸는 일이 없어야 한다.
        assert member.suspended_until == long_until


def test_warning_records_without_blocking() -> None:
    asyncio.run(_test_warning_records_without_blocking())


async def _test_warning_records_without_blocking() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.WARNING, reason="hate",
        )
        assert sanction_service.is_suspended(member) is False
        assert sanction_service.is_matching_restricted(member) is False
        assert len(await sanction_service.list_for_user(session, member.id)) == 1


def test_sanction_notifies_the_member_with_reason_and_period() -> None:
    asyncio.run(_test_sanction_notifies_the_member_with_reason_and_period())


async def _test_sanction_notifies_the_member_with_reason_and_period() -> None:
    """제23조③이 사유·기간·이의제기 방법 고지를 요구한다."""
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="harassment", note="반복 괴롭힘", days=7,
        )

        notice = (await session.execute(
            select(Notification).where(Notification.user_id == member.id)
        )).scalars().one()
        assert notice.type == "account.sanctioned"
        assert "이의" in notice.body
        assert "반복 괴롭힘" in notice.body


def test_release_restores_access_and_keeps_the_record() -> None:
    asyncio.run(_test_release_restores_access_and_keeps_the_record())


async def _test_release_restores_access_and_keeps_the_record() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        sanction = await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="harassment", days=30,
        )

        await sanction_service.release(session, sanction.id, admin)
        await session.refresh(member)

        assert sanction_service.is_suspended(member) is False
        # 무엇을 왜 뒤집었는지가 사라지면 다음 사람이 같은 판단을 못 한다.
        rows = (await session.execute(select(Sanction))).scalars().all()
        assert len(rows) == 1
        assert rows[0].released_at is not None
        assert rows[0].released_by == admin.id

        # 해제도 당사자에게 알린다.
        notices = (await session.execute(
            select(Notification).where(Notification.user_id == member.id)
        )).scalars().all()
        assert any(n.type == "sanction.released" for n in notices)


def test_release_keeps_other_live_sanctions() -> None:
    asyncio.run(_test_release_keeps_other_live_sanctions())


async def _test_release_keeps_other_live_sanctions() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        short = await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="spam", days=3,
        )
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.SUSPENSION,
            reason="harassment", days=30,
        )

        await sanction_service.release(session, short.id, admin)
        await session.refresh(member)
        # 한 건을 풀었다고 다른 제재까지 풀리면 안 된다.
        assert sanction_service.is_suspended(member) is True


def test_rejected_sanctions() -> None:
    asyncio.run(_test_rejected_sanctions())


async def _test_rejected_sanctions() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)

        # 기간이 필요한 제재에 기간이 없다.
        with pytest.raises(HTTPException):
            await sanction_service.issue(
                session, user=member, admin=admin,
                type=sanction_service.SUSPENSION, reason="spam",
            )

        # 운영자끼리 서로를 잠그면 복구 경로가 서버 접근밖에 없다.
        with pytest.raises(HTTPException):
            await sanction_service.issue(
                session, user=admin, admin=admin,
                type=sanction_service.BAN, reason="spam",
            )

        with pytest.raises(HTTPException):
            await sanction_service.issue(
                session, user=member, admin=admin, type="nonsense", reason="spam",
            )

        # 경고는 해제 대상이 아니다. 막고 있는 것이 없다.
        warning = await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.WARNING, reason="hate",
        )
        with pytest.raises(HTTPException):
            await sanction_service.release(session, warning.id, admin)


def test_forced_withdrawal_records_who_did_it() -> None:
    asyncio.run(_test_forced_withdrawal_records_who_did_it())


async def _test_forced_withdrawal_records_who_did_it() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        member, admin = await _pair(session)
        await sanction_service.issue(
            session, user=member, admin=admin, type=sanction_service.WITHDRAWAL,
            reason="fraud", note="사기 정황 확인",
        )

        await session.refresh(member)
        assert member.deleted_at is not None
        # 본인 탈퇴와 강제 탈퇴를 구분할 수 있어야 한다.
        assert member.deleted_by == admin.id
        assert member.email is None

        # 기록 없는 강제 탈퇴가 생기지 않도록 제재 행도 함께 남는다.
        rows = (await session.execute(select(Sanction))).scalars().all()
        assert len(rows) == 1 and rows[0].type == sanction_service.WITHDRAWAL

        # 이미 닫힌 계정은 다시 제재할 수 없다.
        with pytest.raises(HTTPException):
            await sanction_service.issue(
                session, user=member, admin=admin, type=sanction_service.WARNING, reason="spam",
            )
