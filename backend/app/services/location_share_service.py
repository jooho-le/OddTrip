"""가족·친구에게 보내는 위치 공유 링크.

동행과 주고받는 기능이 아니다. 링크를 받은 사람은 우리 회원이 아니고 로그인도
하지 않는다. 그래서 설계의 중심은 "누가 볼 수 있느냐"가 아니라 "링크가 언제
닫히느냐"에 있다. 주소 자체가 열쇠라서, 한 번 나간 링크는 회수할 수 없고 남은
방어선은 짧은 수명과 즉시 끄기뿐이다.

좌표는 ``location_cache``에만 둔다. 이 서비스가 DB에 남기는 것은 동의와 공유
사실, 그리고 링크가 몇 번 열렸는지다.
"""
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.location_share import LocationShare
from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..realtime.location_cache import RETENTION, STALE_AFTER, Position, location_cache
from ..schemas.location_share import (
    LocationPing,
    LocationShareCreate,
    LocationShareExtend,
    LocationShareOut,
    LocationViewOut,
)

# 토큰 길이. 32바이트면 추측으로 맞힐 수 없다. 주소가 곧 열쇠이므로 짧게 줄이지
# 않는다.
TOKEN_BYTES = 24


def _now() -> datetime:
    return datetime.utcnow()


def _to_out(share: LocationShare, *, now: datetime | None = None) -> LocationShareOut:
    position = location_cache.get(share.id, now=now or _now())
    return LocationShareOut(
        id=share.id,
        trip_id=share.trip_id,
        token=share.token,
        display_name=share.display_name,
        expires_at=share.expires_at,
        created_at=share.created_at,
        view_count=share.view_count,
        last_viewed_at=share.last_viewed_at,
        last_position_at=position.at if position else None,
    )


async def _resolve_trip_id(db: AsyncSession, user_id: str, trip_id: str | None) -> str | None:
    """위치 공유를 켠 여행은 본인이 참여한 여행이어야 한다."""
    if not trip_id:
        return None
    found = (
        await db.execute(
            select(Trip.id)
            .join(Match, Match.id == Trip.match_id)
            .where(
                Trip.id == trip_id,
                or_(Match.user_id == user_id, Match.matched_user_id == user_id),
            )
        )
    ).scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    return found


async def get_active(db: AsyncSession, user: User, *, now: datetime | None = None) -> LocationShare | None:
    """지금 살아 있는 공유. 한 사람에게 하나만 둔다.

    여러 링크를 동시에 열어 두면 사용자가 무엇이 열려 있는지 파악하지 못한다.
    화면에서도 "지금 공유 중인가 아닌가" 하나만 보여 준다.
    """
    moment = now or _now()
    return (
        await db.execute(
            select(LocationShare)
            .where(
                LocationShare.user_id == user.id,
                LocationShare.stopped_at.is_(None),
                LocationShare.expires_at > moment,
            )
            .order_by(LocationShare.created_at.desc())
        )
    ).scalars().first()


async def get_active_out(db: AsyncSession, user: User) -> LocationShareOut | None:
    share = await get_active(db, user)
    return _to_out(share) if share else None


async def start(db: AsyncSession, user: User, body: LocationShareCreate) -> LocationShareOut:
    """새 링크를 연다. 이미 열려 있던 링크는 닫는다."""
    if not body.consent:
        raise HTTPException(status_code=400, detail="위치정보 수집·제공에 동의해야 공유를 시작할 수 있습니다.")
    trip_id = await _resolve_trip_id(db, user.id, body.trip_id)

    now = _now()
    previous = await get_active(db, user, now=now)
    if previous:
        # 앞의 링크를 살려 두면 사용자가 모르는 주소가 계속 열려 있게 된다.
        previous.stopped_at = now
        location_cache.drop(previous.id)

    share = LocationShare(
        id=str(uuid.uuid4()),
        user_id=user.id,
        trip_id=trip_id,
        token=secrets.token_urlsafe(TOKEN_BYTES),
        display_name=user.nickname,
        expires_at=now + timedelta(hours=body.duration_hours),
        consented_at=now,
        created_at=now,
    )
    db.add(share)
    await db.commit()
    return _to_out(share, now=now)


async def extend(db: AsyncSession, user: User, share_id: str, body: LocationShareExtend) -> LocationShareOut:
    """남은 시간을 다시 채운다. 연장은 지금부터 다시 센다."""
    share = await _own_active(db, user, share_id)
    now = _now()
    share.expires_at = now + timedelta(hours=body.duration_hours)
    await db.commit()
    return _to_out(share, now=now)


async def stop(db: AsyncSession, user: User, share_id: str) -> None:
    """공유를 끈다. 링크는 즉시 죽고 좌표도 함께 버린다."""
    share = await _own_active(db, user, share_id)
    share.stopped_at = _now()
    location_cache.drop(share.id)
    await db.commit()


async def ping(db: AsyncSession, user: User, share_id: str, body: LocationPing) -> LocationShareOut:
    """현재 좌표를 올린다. 캐시에만 들어가고 DB에는 남지 않는다."""
    share = await _own_active(db, user, share_id)
    now = _now()
    location_cache.put(
        share.id,
        Position(latitude=body.latitude, longitude=body.longitude, accuracy=body.accuracy, at=now),
    )
    return _to_out(share, now=now)


async def _own_active(db: AsyncSession, user: User, share_id: str) -> LocationShare:
    share = await db.get(LocationShare, share_id)
    if not share or share.user_id != user.id:
        raise HTTPException(status_code=404, detail="위치 공유를 찾을 수 없습니다.")
    if share.stopped_at or share.expires_at <= _now():
        raise HTTPException(status_code=409, detail="이미 종료된 위치 공유입니다.")
    return share


async def view(db: AsyncSession, token: str) -> LocationViewOut:
    """링크를 받은 사람이 보는 화면. 인증 없이 열린다.

    끝난 링크에도 404 대신 ``ended``를 돌려준다. 주소를 잘못 입력한 것과 공유가
    끝난 것은 받는 사람에게 완전히 다른 의미이고, 안전 기능에서는 "끝났다"는
    사실 자체가 알아야 할 정보다.
    """
    now = _now()
    share = (
        await db.execute(select(LocationShare).where(LocationShare.token == token))
    ).scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="잘못된 주소이거나 삭제된 링크입니다.")

    if share.stopped_at or share.expires_at <= now:
        return LocationViewOut(display_name=share.display_name, status="ended")

    # 열람 기록은 소유자가 링크가 어디까지 퍼졌는지 가늠하는 단서다.
    share.view_count += 1
    share.last_viewed_at = now
    await db.commit()

    position = location_cache.get(share.id, now=now)
    if position is None:
        # 한 번도 좌표가 안 온 경우와, 오다가 끊긴 경우를 구분한다. 받는 쪽에서
        # "아직 시작 전"과 "연결이 끊겼다"는 전혀 다른 신호다.
        status = "waiting" if now - share.created_at <= RETENTION else "lost"
        return LocationViewOut(
            display_name=share.display_name,
            status=status,
            expires_at=share.expires_at,
        )

    # 좌표가 있어도 방금 것이 아니면 실시간이라고 말하지 않는다. 마지막 위치는
    # 그대로 보여 주되, 멈췄다는 사실을 함께 알린다.
    return LocationViewOut(
        display_name=share.display_name,
        status="live" if now - position.at <= STALE_AFTER else "stale",
        latitude=position.latitude,
        longitude=position.longitude,
        accuracy=position.accuracy,
        updated_at=position.at,
        expires_at=share.expires_at,
    )
