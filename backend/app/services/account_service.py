"""회원 탈퇴 처리."""
from datetime import datetime

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.chat import ChatRoom, ChatRoomMember
from ..models.communication import MatchRequest, MatchUserState
from ..models.match import Match
from ..models.notification import Notification
from ..models.token import RefreshToken
from ..models.user import User
from . import chat_service, notification_service

# What a withdrawn account looks like to everyone else. The row survives, so
# something has to stand in the places a nickname used to be printed.
ANONYMIZED_NICKNAME = "탈퇴한 사용자"


def _now() -> datetime:
    return datetime.utcnow()


async def withdraw(db: AsyncSession, user: User, *, actor_id: str | None = None) -> None:
    """Close the account: soft delete, anonymise, and tear down live state.

    Not a row delete. Almost every table that references ``users`` cascades, so
    removing the row would also take the other party's chat history, the
    reports filed about this user, and the consent ledger with it -- all of
    which the terms keep for dispute handling. The row therefore stays and the
    identifying fields are what actually get erased.

    ``actor_id`` records who performed it, so an administrator forcing a
    closure later is distinguishable from the member leaving on their own.
    """
    now = _now()

    notifications = await _end_live_matches(db, user, now)
    await _withdraw_pending_requests(db, user, now)
    await _revoke_sessions(db, user.id, now)
    _anonymise(user, now, actor_id or user.id)

    await db.commit()
    # Push after the commit, like every other notification here: the row is
    # durable, the socket delivery is best effort on top of it.
    await notification_service.push(notifications)


async def _end_live_matches(db: AsyncSession, user: User, now: datetime) -> list[Notification]:
    """End matches the leaving member is still in, and tell the other side.

    Without this the counterpart keeps an active match and an open room
    pointing at an account that no longer exists, and only finds out by
    opening the chat.
    """
    matches = list((await db.execute(
        select(Match).where(
            Match.status == "active",
            Match.deleted_at.is_(None),
            or_(Match.user_id == user.id, Match.matched_user_id == user.id),
        )
    )).scalars().all())

    notifications: list[Notification] = []
    for match in matches:
        match.status = "ended"
        match.ended_at = now

        room = (await db.execute(
            select(ChatRoom).where(ChatRoom.match_id == match.id)
        )).scalar_one_or_none()
        if room:
            await chat_service.create_system_message(
                db=db,
                match_id=match.id,
                event="match.ended",
                content="상대방이 탈퇴하여 매칭이 종료되었습니다.",
            )
            room.status = "closed"
            room.closed_at = now
            member = await db.get(ChatRoomMember, (room.id, user.id))
            if member:
                member.hidden_at = now

        state = await db.get(MatchUserState, (match.id, user.id))
        if state:
            state.left_at = now

        counterpart_id = match.matched_user_id if match.user_id == user.id else match.user_id
        notification = notification_service.build(
            user_id=counterpart_id,
            type=notification_service.MATCH_ENDED,
            title="매칭이 종료되었어요",
            # 탈퇴 사실만 알리고 누구인지는 말하지 않습니다. 상대 화면에서는
            # 이미 닉네임이 지워지는데 알림에만 남으면 익명화가 무의미해집니다.
            body="상대방이 탈퇴하여 매칭이 종료되었습니다.",
            link="/matches",
            payload={"matchId": match.id, "roomId": room.id if room else None},
        )
        db.add(notification)
        notifications.append(notification)

    return notifications


async def _withdraw_pending_requests(db: AsyncSession, user: User, now: datetime) -> None:
    """Close out requests still waiting on an answer.

    Left alone they would sit in the other member's inbox until they expire,
    and accepting one would create a match with a closed account.
    """
    pending = list((await db.execute(
        select(MatchRequest).where(
            MatchRequest.status == "pending",
            MatchRequest.deleted_at.is_(None),
            or_(MatchRequest.requester_id == user.id, MatchRequest.receiver_id == user.id),
        )
    )).scalars().all())

    for request in pending:
        # Sent by the leaver reads as a cancellation; received by them reads as
        # a rejection. Same outcome, but the other member sees the state that
        # matches what they did.
        request.status = "cancelled" if request.requester_id == user.id else "rejected"
        request.responded_at = now


async def _revoke_sessions(db: AsyncSession, user_id: str, now: datetime) -> None:
    """Kill every refresh token so no session outlives the account."""
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )


def _anonymise(user: User, now: datetime, actor_id: str) -> None:
    """Strip the identifying fields and mark the account closed.

    ``email`` goes to NULL rather than to a placeholder: the column is unique,
    and both Postgres and SQLite allow repeated NULLs, so this clears the
    address for good and lets the person sign up again with it later.
    """
    user.email = None
    user.password_hash = None
    user.nickname = ANONYMIZED_NICKNAME
    user.avatar_url = None
    user.home_region = None
    user.tti_code = None
    user.tti_scores_json = None
    user.deleted_at = now
    user.deleted_by = actor_id
