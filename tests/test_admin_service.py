import asyncio
import uuid
from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from backend.app.database import Base
from backend.app.models import User
from backend.app.services import admin_service
from tests.test_chat_service import _sqlite_test_engine


async def _session_factory():
    engine = _sqlite_test_engine()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    return async_sessionmaker(engine, expire_on_commit=False)


def _user(email: str, *, role: str = "user", deleted: bool = False) -> User:
    return User(
        id=str(uuid.uuid4()),
        email=email,
        nickname=email.split("@")[0],
        role=role,
        created_at=datetime.utcnow(),
        deleted_at=datetime.utcnow() if deleted else None,
    )


def test_promote_and_demote() -> None:
    asyncio.run(_test_promote_and_demote())


async def _test_promote_and_demote() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        session.add_all([_user("first@example.com"), _user("second@example.com")])
        await session.commit()

        # 대소문자와 공백이 섞여 들어와도 가입 시 정규화된 주소로 찾습니다.
        promoted = await admin_service.promote(session, "  First@Example.com ")
        assert promoted.role == "admin"

        # 멱등: 이미 관리자면 그대로 둡니다.
        assert (await admin_service.promote(session, "first@example.com")).role == "admin"
        assert len(await admin_service.list_admins(session)) == 1

        await admin_service.promote(session, "second@example.com")
        assert len(await admin_service.list_admins(session)) == 2

        demoted = await admin_service.demote(session, "second@example.com")
        assert demoted.role == "user"
        assert len(await admin_service.list_admins(session)) == 1


def test_last_admin_cannot_be_demoted() -> None:
    asyncio.run(_test_last_admin_cannot_be_demoted())


async def _test_last_admin_cannot_be_demoted() -> None:
    """관리자가 0명이 되면 다시 올릴 방법이 서버 접근밖에 남지 않습니다."""
    sessions = await _session_factory()

    async with sessions() as session:
        session.add(_user("only@example.com", role="admin"))
        await session.commit()

        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.demote(session, "only@example.com")

        assert len(await admin_service.list_admins(session)) == 1


def test_missing_and_withdrawn_accounts_are_rejected() -> None:
    asyncio.run(_test_missing_and_withdrawn_accounts_are_rejected())


async def _test_missing_and_withdrawn_accounts_are_rejected() -> None:
    sessions = await _session_factory()

    async with sessions() as session:
        session.add(_user("gone@example.com", deleted=True))
        await session.commit()

        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.promote(session, "nobody@example.com")

        # 탈퇴 계정을 관리자로 되살리는 경로가 있으면 안 됩니다.
        with pytest.raises(admin_service.AdminRoleError):
            await admin_service.promote(session, "gone@example.com")

        # 일반 사용자를 강등해도 오류가 아니라 무동작입니다.
        session.add(_user("plain@example.com"))
        await session.commit()
        assert (await admin_service.demote(session, "plain@example.com")).role == "user"
