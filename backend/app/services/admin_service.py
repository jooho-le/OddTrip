"""관리자 권한 관리.

권한을 올리는 HTTP 엔드포인트는 두지 않는다. API로 승격할 수 있으면 그
경로 자체가 권한 상승 통로가 되므로, 승격은 서버에 접근할 수 있는 사람이
손으로 실행하는 동작으로 남긴다. CLI(`backend.app.cli`)가 그 입구다.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User

ROLE_ADMIN = "admin"
ROLE_USER = "user"


class AdminRoleError(Exception):
    """승격·강등을 진행할 수 없는 경우. CLI가 메시지를 그대로 출력한다."""


async def _find_active_user(db: AsyncSession, email: str) -> User:
    normalized = email.strip().lower()
    result = await db.execute(
        select(User).where(User.email == normalized, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        # 탈퇴 계정은 이메일이 NULL로 비워지므로 이 조회에 잡히지 않는다.
        raise AdminRoleError(f"{normalized} 계정을 찾을 수 없습니다.")
    return user


async def list_admins(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.role == ROLE_ADMIN, User.deleted_at.is_(None))
        .order_by(User.created_at)
    )
    return list(result.scalars().all())


async def promote(db: AsyncSession, email: str) -> User:
    """계정을 관리자로 올린다. 이미 관리자면 아무것도 하지 않는다."""
    user = await _find_active_user(db, email)
    if user.role == ROLE_ADMIN:
        return user
    user.role = ROLE_ADMIN
    await db.commit()
    await db.refresh(user)
    return user


async def demote(db: AsyncSession, email: str) -> User:
    """관리자 권한을 회수한다.

    마지막 한 명은 내리지 않는다. 관리자가 0명이 되면 다시 올릴 방법이
    서버 접근밖에 남지 않아, 운영 중에 스스로를 잠그는 사고가 된다.
    """
    user = await _find_active_user(db, email)
    if user.role != ROLE_ADMIN:
        return user

    admins = await list_admins(db)
    if len(admins) <= 1:
        raise AdminRoleError("마지막 관리자는 강등할 수 없습니다.")

    user.role = ROLE_USER
    await db.commit()
    await db.refresh(user)
    return user
