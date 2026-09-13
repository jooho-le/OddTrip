import uuid
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.notification import Notification
from ..realtime import chat_connection_manager
from ..schemas.notification import NotificationOut

# Event types. Kept as constants so the router, the services and the client
# contract cannot drift apart on a typo.
MATCH_REQUEST_RECEIVED = "match_request.received"
MATCH_REQUEST_ACCEPTED = "match_request.accepted"
MATCH_REQUEST_REJECTED = "match_request.rejected"
MATCH_ENDED = "match.ended"


def _now() -> datetime:
    return datetime.utcnow()


def build(
    *,
    user_id: str,
    type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    payload: dict | None = None,
) -> Notification:
    """Create the row object without touching the session.

    Callers add it inside their own transaction so the notification commits
    together with the change that caused it.
    """
    return Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        link=link,
        payload_json=payload,
        created_at=_now(),
    )


async def push(notifications: list[Notification]) -> None:
    """Best-effort realtime delivery for rows that are already committed.

    A failure here is not worth failing the request over: the row is durable,
    so the recipient still sees it on their next poll.
    """
    for notification in notifications:
        await chat_connection_manager.send_to_users(
            {notification.user_id},
            {
                "event": "notification.created",
                "data": to_out(notification).model_dump(by_alias=True, mode="json"),
            },
        )


def to_out(notification: Notification) -> NotificationOut:
    return NotificationOut(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        link=notification.link,
        payload=notification.payload_json,
        read=notification.read_at is not None,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


async def list_notifications(
    db: AsyncSession,
    user_id: str,
    *,
    unread_only: bool,
    before: datetime | None,
    limit: int,
) -> tuple[list[NotificationOut], datetime | None]:
    query = (
        select(Notification)
        .where(Notification.user_id == user_id, Notification.deleted_at.is_(None))
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit + 1)
    )
    if unread_only:
        query = query.where(Notification.read_at.is_(None))
    if before:
        query = query.where(Notification.created_at < before)

    rows = list((await db.execute(query)).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    next_before = rows[-1].created_at if has_more and rows else None
    return [to_out(row) for row in rows], next_before


async def get_unread_count(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id,
            Notification.deleted_at.is_(None),
            Notification.read_at.is_(None),
        )
    )
    return int(result.scalar_one())


async def mark_read(
    db: AsyncSession, user_id: str, notification_ids: list[str] | None
) -> tuple[int, int]:
    """Mark notifications read. Returns (updated rows, remaining unread)."""
    if notification_ids is not None and not notification_ids:
        return 0, await get_unread_count(db, user_id)

    statement = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.deleted_at.is_(None),
            Notification.read_at.is_(None),
        )
        .values(read_at=_now())
    )
    if notification_ids is not None:
        statement = statement.where(Notification.id.in_(notification_ids))

    result = await db.execute(statement)
    await db.commit()
    return int(result.rowcount or 0), await get_unread_count(db, user_id)
