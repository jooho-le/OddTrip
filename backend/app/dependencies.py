from typing import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import legal
from .database import async_session
from .config import settings
from .models.match import Match
from .models.trip import Trip
from .models.user import User
from .security import decode_access_token
from .services import consent_service

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = decode_access_token(credentials.credentials) if credentials else None
    if not user_id and settings.allow_demo_user_header_auth:
        user_id = x_user_id
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Gate for admin-only endpoints.

    403 rather than 404: the caller is authenticated, they just lack the role.
    """
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다.")
    return user


async def require_matching_consent(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Gate for the matching surface.

    Disclosing a profile to candidates is what the matching consent
    authorises, and the safety briefing is what the user is meant to have read
    before acting on a match. Both gates are rendered client-side too, but a
    gate that only exists in the screen is not a gate.

    403 rather than 404: the caller is authenticated and the resource exists,
    they simply have an unmet precondition they can satisfy themselves.
    """
    for consent_type in legal.MATCHING_GATES:
        if not await consent_service.has_accepted(db, user.id, consent_type):
            raise HTTPException(
                status_code=403,
                detail="매칭 프로필 공개 동의와 안전 이용수칙 확인이 필요합니다.",
            )
    return user


async def get_current_user_trip(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Trip:
    result = await db.execute(
        select(Trip)
        .join(Match, Match.id == Trip.match_id)
        .where(
            Trip.id == trip_id,
            (Match.user_id == user.id) | (Match.matched_user_id == user.id),
        )
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    return trip
