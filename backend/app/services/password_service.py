import secrets
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models.token import PasswordResetToken, RefreshToken
from ..models.user import User
from ..security import hash_password, hash_refresh_token, utcnow, verify_password
from . import email_service


async def change_password(
    db: AsyncSession, user: User, current_password: str, new_password: str
) -> None:
    locked_user = (await db.execute(
        select(User)
        .where(User.id == user.id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )).scalar_one()
    if not locked_user.password_hash or not verify_password(current_password, locked_user.password_hash):
        # The bearer token already authenticated the request. Treat a wrong
        # confirmation value as input failure, not as an expired bearer token.
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    if verify_password(new_password, locked_user.password_hash):
        raise HTTPException(status_code=400, detail="새 비밀번호는 현재 비밀번호와 달라야 합니다.")

    locked_user.password_hash = hash_password(new_password)
    now = utcnow()
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == locked_user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == locked_user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    await db.commit()


async def request_password_reset(db: AsyncSession, email: str) -> str | None:
    """Create and deliver a token, returning it only to the debug caller."""
    email_service.ensure_password_reset_delivery()
    user = (await db.execute(
        select(User)
        .where(User.email == email, User.deleted_at.is_(None))
        .with_for_update()
    )).scalar_one_or_none()
    if not user:
        return None

    now = utcnow()
    await db.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(48)
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw),
        expires_at=now + timedelta(minutes=settings.password_reset_token_expire_minutes),
    ))
    # Commit before performing network I/O: the delivered link must already be
    # valid, and an SMTP timeout must not hold the user row lock open.
    await db.commit()
    try:
        await email_service.send_password_reset(email, raw)
    except HTTPException:
        # Do not turn a provider-side recipient failure into an account
        # existence oracle. The mail layer already logged the operational
        # error; the public endpoint keeps its uniform accepted response.
        return None
    return raw if settings.password_reset_debug else None


async def reset_password(db: AsyncSession, raw_token: str, new_password: str) -> None:
    now = utcnow()
    token_hash = hash_refresh_token(raw_token)
    candidate = (await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=400, detail="재설정 링크가 올바르지 않거나 만료되었습니다.")

    # All password mutations lock the user first and the reset token second.
    # This makes simultaneous change/reset requests deterministic and avoids a
    # token-lock/user-lock inversion.
    user = (await db.execute(
        select(User)
        .where(User.id == candidate.user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )).scalar_one_or_none()
    token = (await db.execute(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == token_hash)
        .with_for_update()
        .execution_options(populate_existing=True)
    )).scalar_one_or_none()
    if not token or token.used_at is not None or token.expires_at < now:
        raise HTTPException(status_code=400, detail="재설정 링크가 올바르지 않거나 만료되었습니다.")

    if not user or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="재설정 링크가 올바르지 않거나 만료되었습니다.")
    if user.password_hash and verify_password(new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="새 비밀번호는 이전 비밀번호와 달라야 합니다.")

    user.password_hash = hash_password(new_password)
    token.used_at = now
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.id != token.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.commit()
