import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import get_current_user, get_db
from ..models.token import RefreshToken
from ..models.user import User
from ..schemas.auth import AuthLoginIn, AuthOut, AuthRegisterIn, RefreshIn
from ..schemas.user import UserOut
from ..security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    hash_password,
    utcnow,
    verify_password,
)

router = APIRouter()


async def _issue_tokens(db: AsyncSession, user: User) -> AuthOut:
    """Mint an access/refresh pair and persist the refresh half."""
    refresh = create_refresh_token()
    db.add(RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=hash_refresh_token(refresh),
        expires_at=utcnow() + timedelta(days=settings.refresh_token_expire_days),
    ))
    return AuthOut(
        access_token=create_access_token(user.id),
        refresh_token=refresh,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=dict)
async def register(body: AuthRegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
        avatar_url=body.avatar_url,
        home_region=body.home_region,
    )
    db.add(user)
    await db.flush()

    data = await _issue_tokens(db, user)
    await db.commit()
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.post("/login", response_model=dict)
async def login(body: AuthLoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    data = await _issue_tokens(db, user)
    await db.commit()
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.post("/refresh", response_model=dict)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new pair.

    The presented token is revoked as part of the exchange (rotation), so a
    leaked token is only usable until the legitimate client refreshes next.
    """
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(body.refresh_token))
    )
    token = result.scalar_one_or_none()
    now = utcnow()
    if not token or token.revoked_at is not None or token.expires_at < now:
        raise HTTPException(status_code=401, detail="다시 로그인해주세요.")

    user = await db.get(User, token.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="다시 로그인해주세요.")

    token.revoked_at = now
    data = await _issue_tokens(db, user)

    # Opportunistic cleanup so dead rows do not accumulate for this user.
    stale = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id, RefreshToken.expires_at < now
        )
    )
    for row in stale.scalars().all():
        await db.delete(row)

    await db.commit()
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.post("/logout", response_model=dict)
async def logout(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    """Revoke one session.

    Takes the refresh token rather than the access token so that logging out
    still works after the short-lived access token has expired. Unknown tokens
    return 200: the caller's intent (be logged out) is satisfied either way.
    """
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(body.refresh_token))
    )
    token = result.scalar_one_or_none()
    if token and token.revoked_at is None:
        token.revoked_at = utcnow()
        await db.commit()
    return {"data": {"success": True}, "error": None}


@router.get("/me", response_model=dict)
async def me(user: User = Depends(get_current_user)):
    return {"data": UserOut.model_validate(user).model_dump(by_alias=True), "error": None}
