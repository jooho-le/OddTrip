"""제재 부과와 해제.

약관 제23조①의 조치 목록을 그대로 유형으로 둔다. 부과와 해제는 모두 sanctions
표에 남고, 차단 여부 판단에 쓰이는 현재 상태만 users 행에 반영된다.
"""
import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification
from ..models.sanction import Sanction
from ..models.user import User
from . import account_service, notification_service

WARNING = "warning"
MATCHING_RESTRICTION = "matching_restriction"
SUSPENSION = "suspension"
BAN = "ban"
WITHDRAWAL = "withdrawal"

TYPES = (WARNING, MATCHING_RESTRICTION, SUSPENSION, BAN, WITHDRAWAL)
# 기간을 받는 유형. 나머지는 기간 개념이 없다.
TIMED_TYPES = (MATCHING_RESTRICTION, SUSPENSION)
# 해제할 수 있는 유형. 탈퇴는 복구 경로가 없다고 약관 제24조⑤에 적어 두었다.
RELEASABLE_TYPES = (MATCHING_RESTRICTION, SUSPENSION, BAN)

LABELS = {
    WARNING: "경고",
    MATCHING_RESTRICTION: "매칭 기능 제한",
    SUSPENSION: "계정 일시 정지",
    BAN: "영구 이용정지",
    WITHDRAWAL: "이용계약 해지",
}


def _now() -> datetime:
    return datetime.utcnow()


def is_suspended(user: User, at: datetime | None = None) -> bool:
    now = at or _now()
    if user.banned_at:
        return True
    return bool(user.suspended_until and user.suspended_until > now)


def is_matching_restricted(user: User, at: datetime | None = None) -> bool:
    now = at or _now()
    if is_suspended(user, now):
        return True
    return bool(user.matching_restricted_until and user.matching_restricted_until > now)


def account_status(user: User, at: datetime | None = None) -> str:
    """운영 화면에 보이는 계정 상태."""
    if user.deleted_at:
        return "withdrawn"
    if is_suspended(user, at):
        return "suspended"
    return "active"


async def issue(
    db: AsyncSession,
    *,
    user: User,
    admin: User,
    type: str,
    reason: str,
    note: str | None = None,
    days: int | None = None,
    report_id: str | None = None,
) -> Sanction:
    """제재를 부과하고 당사자에게 알린다.

    제23조③이 사유와 기간, 이의제기 방법을 알리도록 하고 있으므로 통지는
    선택이 아니다. 탈퇴 제재만 예외인데, 계정이 닫히면 알림을 볼 사람이 없다.
    """
    if type not in TYPES:
        raise HTTPException(status_code=400, detail=f"처리할 수 없는 제재입니다: {type}")
    if user.deleted_at:
        raise HTTPException(status_code=400, detail="이미 탈퇴한 계정입니다.")
    if user.role == "admin":
        # 운영자끼리 서로를 잠그면 복구 경로가 서버 접근밖에 남지 않는다.
        raise HTTPException(status_code=400, detail="관리자 계정은 제재할 수 없습니다.")
    if type in TIMED_TYPES and not days:
        raise HTTPException(status_code=400, detail="기간을 지정해야 하는 제재입니다.")
    if days is not None and not (1 <= days <= 3650):
        raise HTTPException(status_code=400, detail="제재 기간은 1일에서 3650일 사이여야 합니다.")

    now = _now()
    expires_at = now + timedelta(days=days) if type in TIMED_TYPES else None

    sanction = Sanction(
        id=str(uuid.uuid4()),
        user_id=user.id,
        type=type,
        reason=reason,
        note=(note or "").strip() or None,
        expires_at=expires_at,
        report_id=report_id,
        issued_by=admin.id,
        created_at=now,
    )
    db.add(sanction)

    # 기간제 제재는 이미 걸린 것보다 짧아지지 않게 뒤로만 민다. 짧은 제재를
    # 나중에 부과해 앞선 제재를 실질적으로 풀어버리는 일이 없어야 한다.
    if type == SUSPENSION:
        user.suspended_until = max(expires_at, user.suspended_until or expires_at)
    elif type == MATCHING_RESTRICTION:
        user.matching_restricted_until = max(
            expires_at, user.matching_restricted_until or expires_at
        )
    elif type == BAN:
        user.banned_at = now

    notification = None
    if type != WITHDRAWAL:
        notification = _build_notice(user_id=user.id, sanction=sanction)
        db.add(notification)

    if type == WITHDRAWAL:
        # 탈퇴는 그 자체가 커밋을 포함한다. 제재 행도 같은 트랜잭션에서 함께
        # 저장되므로 기록 없는 강제 탈퇴는 생기지 않는다.
        await account_service.withdraw(db, user, actor_id=admin.id)
    else:
        await db.commit()
        await notification_service.push([notification])

    await db.refresh(sanction)
    return sanction


def _build_notice(*, user_id: str, sanction: Sanction) -> Notification:
    label = LABELS.get(sanction.type, sanction.type)
    if sanction.expires_at:
        until = sanction.expires_at.strftime("%Y년 %m월 %d일")
        body = f"{label} 조치가 적용되었습니다. {until}까지 적용되며, 고객센터로 이의를 제기할 수 있습니다."
    else:
        body = f"{label} 조치가 적용되었습니다. 고객센터로 이의를 제기할 수 있습니다."
    if sanction.note:
        body = f"{body} 사유: {sanction.note}"

    return notification_service.build(
        user_id=user_id,
        type=notification_service.ACCOUNT_SANCTIONED,
        title=f"{label} 안내",
        body=body,
        link="/legal/community",
        payload={"sanctionId": sanction.id, "type": sanction.type},
    )


async def release(db: AsyncSession, sanction_id: str, admin: User) -> Sanction:
    """이의제기가 받아들여졌을 때 제재를 푼다 (제23조⑥).

    행을 지우지 않고 해제 시점을 남긴다. 무엇을 왜 뒤집었는지가 사라지면
    다음 사람이 같은 판단을 다시 할 수 없다.
    """
    sanction = await db.get(Sanction, sanction_id)
    if not sanction:
        raise HTTPException(status_code=404, detail="제재 기록을 찾을 수 없습니다.")
    if sanction.type not in RELEASABLE_TYPES:
        raise HTTPException(status_code=400, detail="해제할 수 있는 제재가 아닙니다.")
    if sanction.released_at:
        return sanction

    now = _now()
    sanction.released_at = now
    sanction.released_by = admin.id

    user = await db.get(User, sanction.user_id)
    if user:
        # 같은 종류의 다른 제재가 아직 살아 있을 수 있으므로, 남은 것들 중
        # 가장 늦은 만료 시각으로 다시 계산한다.
        await _recalculate(db, user, now)

        notification = notification_service.build(
            user_id=user.id,
            type=notification_service.SANCTION_RELEASED,
            title="제재가 해제되었어요",
            body=f"{LABELS.get(sanction.type, sanction.type)} 조치가 해제되었습니다.",
            link="/home",
            payload={"sanctionId": sanction.id},
        )
        db.add(notification)
        await db.commit()
        await notification_service.push([notification])
    else:
        await db.commit()

    return sanction


async def _recalculate(db: AsyncSession, user: User, now: datetime) -> None:
    active = list((await db.execute(
        select(Sanction).where(
            Sanction.user_id == user.id,
            Sanction.released_at.is_(None),
        )
    )).scalars().all())

    suspensions = [s.expires_at for s in active if s.type == SUSPENSION and s.expires_at]
    restrictions = [s.expires_at for s in active if s.type == MATCHING_RESTRICTION and s.expires_at]

    user.suspended_until = max(suspensions) if suspensions else None
    user.matching_restricted_until = max(restrictions) if restrictions else None
    user.banned_at = user.banned_at if any(s.type == BAN for s in active) else None


async def list_for_user(db: AsyncSession, user_id: str) -> list[Sanction]:
    return list((await db.execute(
        select(Sanction)
        .where(Sanction.user_id == user_id)
        .order_by(Sanction.created_at.desc())
    )).scalars().all())
