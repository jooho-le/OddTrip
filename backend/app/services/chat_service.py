import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.chat import ChatMessage, ChatRoom, ChatRoomMember
from ..models.communication import Block, Report
from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..schemas.chat import (
    ChatCounterpartOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatReadOut,
    ChatReportIn,
    ChatReportOut,
    ChatRoomOut,
    ChatTripOut,
)
from .chat_rate_limiter import chat_rate_limiter


def _now() -> datetime:
    return datetime.utcnow()


async def are_users_blocked(db: AsyncSession, user_a: str, user_b: str) -> bool:
    result = await db.execute(
        select(Block.id).where(
            Block.deleted_at.is_(None),
            Block.released_at.is_(None),
            or_(
                (Block.blocker_id == user_a) & (Block.blocked_user_id == user_b),
                (Block.blocker_id == user_b) & (Block.blocked_user_id == user_a),
            ),
        )
    )
    return result.first() is not None


async def get_match_for_user(db: AsyncSession, match_id: str, user_id: str) -> Match:
    result = await db.execute(
        select(Match).where(
            Match.id == match_id,
            Match.deleted_at.is_(None),
            or_(Match.user_id == user_id, Match.matched_user_id == user_id),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    return match


async def get_room_for_user(
    db: AsyncSession, room_id: str, user_id: str, *, lock: bool = False
) -> tuple[ChatRoom, Match]:
    query = (
        select(ChatRoom, Match)
        .join(Match, Match.id == ChatRoom.match_id)
        .join(
            ChatRoomMember,
            (ChatRoomMember.room_id == ChatRoom.id) & (ChatRoomMember.user_id == user_id),
        )
        .where(
            ChatRoom.id == room_id,
            ChatRoom.deleted_at.is_(None),
            Match.deleted_at.is_(None),
            ChatRoomMember.deleted_at.is_(None),
            ChatRoomMember.hidden_at.is_(None),
        )
    )
    if lock:
        query = query.with_for_update(of=ChatRoom)
    row = (await db.execute(query)).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    return row[0], row[1]


async def provision_room(
    db: AsyncSession,
    match: Match,
    *,
    greeting_message: str | None = None,
    greeting_sender_id: str | None = None,
) -> ChatRoom:
    """Add a match room and its members to the current transaction."""
    existing = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))).scalar_one_or_none()
    if existing:
        return existing

    now = _now()
    room = ChatRoom(
        id=str(uuid.uuid4()),
        match_id=match.id,
        status="active",
        next_sequence=1,
        created_at=now,
        updated_at=now,
    )
    db.add(room)
    db.add_all([
        ChatRoomMember(room_id=room.id, user_id=match.user_id, last_read_sequence=0, joined_at=now, updated_at=now),
        ChatRoomMember(room_id=room.id, user_id=match.matched_user_id, last_read_sequence=0, joined_at=now, updated_at=now),
    ])
    if greeting_message and greeting_sender_id:
        message = ChatMessage(
            id=str(uuid.uuid4()),
            room_id=room.id,
            sender_id=greeting_sender_id,
            sequence=1,
            client_message_id=str(uuid.uuid4()),
            type="text",
            content=greeting_message,
            created_at=now,
        )
        db.add(message)
        room.next_sequence = 2
        room.last_message_id = message.id
        room.last_message_at = now
    await db.flush()
    return room


async def get_or_create_room(db: AsyncSession, match_id: str, user_id: str) -> ChatRoomOut:
    match = await get_match_for_user(db, match_id, user_id)
    if match.status != "active":
        raise HTTPException(status_code=409, detail="종료된 매칭입니다.")
    if await are_users_blocked(db, match.user_id, match.matched_user_id):
        raise HTTPException(status_code=409, detail="차단된 사용자와 채팅할 수 없습니다.")
    try:
        room = await provision_room(db, match)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        match = await get_match_for_user(db, match_id, user_id)
        room = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))).scalar_one()
    return await build_room_out(db, room, match, user_id)


async def list_rooms(
    db: AsyncSession,
    user_id: str,
    *,
    status: str | None,
    before: datetime | None,
    limit: int,
) -> tuple[list[ChatRoomOut], datetime | None]:
    sort_time = func.coalesce(ChatRoom.last_message_at, ChatRoom.created_at)
    query = (
        select(ChatRoom, Match)
        .join(Match, Match.id == ChatRoom.match_id)
        .join(
            ChatRoomMember,
            (ChatRoomMember.room_id == ChatRoom.id) & (ChatRoomMember.user_id == user_id),
        )
        .where(
            ChatRoom.deleted_at.is_(None),
            Match.deleted_at.is_(None),
            ChatRoomMember.deleted_at.is_(None),
            ChatRoomMember.hidden_at.is_(None),
        )
        .order_by(sort_time.desc(), ChatRoom.id.desc())
        .limit(limit + 1)
    )
    if status:
        query = query.where(ChatRoom.status == status)
    if before:
        query = query.where(sort_time < before)

    rows = (await db.execute(query)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    items = [await build_room_out(db, room, match, user_id) for room, match in rows]
    next_before = None
    if has_more and rows:
        next_before = rows[-1][0].last_message_at or rows[-1][0].created_at
    return items, next_before


async def get_room_detail(db: AsyncSession, room_id: str, user_id: str) -> ChatRoomOut:
    room, match = await get_room_for_user(db, room_id, user_id)
    return await build_room_out(db, room, match, user_id)


async def list_messages(
    db: AsyncSession,
    room_id: str,
    user_id: str,
    *,
    before_sequence: int | None,
    limit: int,
) -> tuple[list[ChatMessageOut], int | None]:
    await get_room_for_user(db, room_id, user_id)
    query = (
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.sequence.desc())
        .limit(limit + 1)
    )
    if before_sequence is not None:
        query = query.where(ChatMessage.sequence < before_sequence)
    messages = list((await db.execute(query)).scalars().all())
    has_more = len(messages) > limit
    messages = messages[:limit]
    messages.reverse()
    return (
        [message_to_out(message) for message in messages],
        messages[0].sequence if has_more and messages else None,
    )


async def create_message(
    db: AsyncSession,
    room_id: str,
    user_id: str,
    body: ChatMessageCreate,
) -> tuple[ChatMessageOut, Match, bool]:
    duplicate = (await db.execute(
        select(ChatMessage).where(
            ChatMessage.sender_id == user_id,
            ChatMessage.client_message_id == body.client_message_id,
        )
    )).scalar_one_or_none()
    if duplicate:
        if duplicate.room_id != room_id:
            raise HTTPException(status_code=409, detail="이미 다른 채팅방에서 사용한 clientMessageId입니다.")
        _, match = await get_room_for_user(db, room_id, user_id)
        return message_to_out(duplicate), match, False

    room, match = await get_room_for_user(db, room_id, user_id, lock=True)
    if room.status != "active" or match.status != "active":
        raise HTTPException(status_code=409, detail="종료된 채팅방에는 메시지를 보낼 수 없습니다.")
    counterpart_id = match.matched_user_id if match.user_id == user_id else match.user_id
    if await are_users_blocked(db, user_id, counterpart_id):
        raise HTTPException(status_code=409, detail="차단된 사용자와 채팅할 수 없습니다.")
    await chat_rate_limiter.check(user_id)

    sequence = room.next_sequence
    now = _now()
    message = ChatMessage(
        id=str(uuid.uuid4()),
        room_id=room.id,
        sender_id=user_id,
        sequence=sequence,
        client_message_id=body.client_message_id,
        type="text",
        content=body.content,
        created_at=now,
    )
    room.next_sequence = sequence + 1
    room.last_message_id = message.id
    room.last_message_at = now
    room.updated_at = now
    db.add(message)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        duplicate = (await db.execute(
            select(ChatMessage).where(
                ChatMessage.sender_id == user_id,
                ChatMessage.client_message_id == body.client_message_id,
            )
        )).scalar_one_or_none()
        if duplicate and duplicate.room_id == room_id:
            _, match = await get_room_for_user(db, room_id, user_id)
            return message_to_out(duplicate), match, False
        raise
    return message_to_out(message), match, True


async def create_system_message(
    db: AsyncSession,
    *,
    match_id: str,
    event: str,
    content: str,
    payload: dict | None = None,
    commit: bool = False,
) -> ChatMessageOut:
    match = (await db.execute(
        select(Match).where(Match.id == match_id, Match.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    room = (await db.execute(
        select(ChatRoom).where(ChatRoom.match_id == match_id, ChatRoom.deleted_at.is_(None)).with_for_update()
    )).scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    now = _now()
    message = ChatMessage(
        id=str(uuid.uuid4()),
        room_id=room.id,
        sender_id=None,
        sequence=room.next_sequence,
        client_message_id=str(uuid.uuid4()),
        type="system",
        content=content,
        payload_json={"event": event, **(payload or {})},
        created_at=now,
    )
    room.next_sequence += 1
    room.last_message_id = message.id
    room.last_message_at = now
    room.updated_at = now
    db.add(message)
    await db.flush()
    if commit:
        await db.commit()
    return message_to_out(message)


async def delete_message(
    db: AsyncSession, room_id: str, message_id: str, user_id: str
) -> tuple[ChatMessageOut, Match, bool]:
    _, match = await get_room_for_user(db, room_id, user_id)
    message = (await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.room_id == room_id)
    )).scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    if message.sender_id != user_id:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    changed = message.deleted_at is None
    if changed:
        message.deleted_at = _now()
        message.deleted_by = user_id
        await db.commit()
    return message_to_out(message), match, changed


async def mark_read(
    db: AsyncSession, room_id: str, user_id: str, requested_sequence: int
) -> tuple[ChatReadOut, Match, bool]:
    room, match = await get_room_for_user(db, room_id, user_id, lock=True)
    target = min(requested_sequence, max(room.next_sequence - 1, 0))
    state = await db.get(ChatRoomMember, (room_id, user_id))
    if not state:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    changed = target > state.last_read_sequence
    if changed:
        state.last_read_sequence = target
        state.updated_at = _now()
        await db.commit()
    return ChatReadOut.model_validate(state), match, changed


async def hide_room(db: AsyncSession, room_id: str, user_id: str) -> ChatRoomMember:
    await get_room_for_user(db, room_id, user_id)
    member = await db.get(ChatRoomMember, (room_id, user_id))
    if not member:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    if not member.hidden_at:
        member.hidden_at = _now()
        await db.commit()
    return member


async def report_message(
    db: AsyncSession,
    room_id: str,
    message_id: str,
    user_id: str,
    body: ChatReportIn,
) -> ChatReportOut:
    await get_room_for_user(db, room_id, user_id)
    message = (await db.execute(
        select(ChatMessage).where(ChatMessage.id == message_id, ChatMessage.room_id == room_id)
    )).scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="메시지를 찾을 수 없습니다.")
    if message.sender_id is None:
        raise HTTPException(status_code=409, detail="시스템 메시지는 신고할 수 없습니다.")
    if message.sender_id == user_id:
        raise HTTPException(status_code=409, detail="자신의 메시지는 신고할 수 없습니다.")
    existing = (await db.execute(
        select(Report).where(
            Report.reporter_id == user_id,
            Report.message_id == message_id,
            Report.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="이미 신고한 메시지입니다.")
    report = Report(
        id=str(uuid.uuid4()),
        reporter_id=user_id,
        reported_user_id=message.sender_id,
        room_id=room_id,
        message_id=message_id,
        reason=body.reason,
        details=body.details.strip() if body.details else None,
        status="pending",
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(report)
    await db.commit()
    return ChatReportOut.model_validate(report)


async def get_total_unread_count(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatRoom, ChatRoom.id == ChatMessage.room_id)
        .join(Match, Match.id == ChatRoom.match_id)
        .join(
            ChatRoomMember,
            (ChatRoomMember.room_id == ChatRoom.id) & (ChatRoomMember.user_id == user_id),
        )
        .where(
            ChatRoom.deleted_at.is_(None),
            Match.deleted_at.is_(None),
            ChatRoomMember.deleted_at.is_(None),
            ChatRoomMember.hidden_at.is_(None),
            ChatMessage.sender_id != user_id,
            ChatMessage.deleted_at.is_(None),
            ChatMessage.sequence > ChatRoomMember.last_read_sequence,
        )
    )
    return int(result.scalar_one())


async def build_room_out(db: AsyncSession, room: ChatRoom, match: Match, user_id: str) -> ChatRoomOut:
    counterpart_id = match.matched_user_id if match.user_id == user_id else match.user_id
    counterpart = await db.get(User, counterpart_id)
    if not counterpart:
        raise HTTPException(status_code=404, detail="상대 사용자 정보를 찾을 수 없습니다.")
    trip = (await db.execute(select(Trip).where(Trip.match_id == match.id).order_by(Trip.created_at.desc()))).scalars().first()
    last_message = await db.get(ChatMessage, room.last_message_id) if room.last_message_id else None
    member = await db.get(ChatRoomMember, (room.id, user_id))
    counterpart_member = await db.get(ChatRoomMember, (room.id, counterpart_id))
    last_read = member.last_read_sequence if member else 0
    unread = await db.execute(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.room_id == room.id,
            ChatMessage.sender_id != user_id,
            ChatMessage.deleted_at.is_(None),
            ChatMessage.sequence > last_read,
        )
    )
    return ChatRoomOut(
        id=room.id,
        match_id=match.id,
        status=room.status,
        counterpart=ChatCounterpartOut.model_validate(counterpart),
        trip=ChatTripOut.model_validate(trip) if trip else None,
        match_level=match.match_level,
        recommendation_score=match.recommendation_score,
        my_tti_code_snapshot=(
            match.user_tti_code_snapshot
            if match.user_id == user_id
            else match.matched_user_tti_code_snapshot
        ),
        counterpart_tti_code_snapshot=(
            match.matched_user_tti_code_snapshot
            if match.user_id == user_id
            else match.user_tti_code_snapshot
        ),
        differences=match.differences_json or [],
        complements=match.complements_json or [],
        current_step=trip.status if trip else None,
        last_message=message_to_out(last_message) if last_message else None,
        unread_count=int(unread.scalar_one()),
        counterpart_last_read_sequence=counterpart_member.last_read_sequence if counterpart_member else 0,
        created_at=room.created_at,
        updated_at=room.updated_at,
    )


def message_to_out(message: ChatMessage) -> ChatMessageOut:
    deleted = message.deleted_at is not None
    return ChatMessageOut(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sequence=message.sequence,
        client_message_id=message.client_message_id,
        type=message.type,
        content=None if deleted else message.content,
        payload=message.payload_json,
        created_at=message.created_at,
        deleted_at=message.deleted_at,
        deleted=deleted,
        display_text="삭제된 메시지입니다" if deleted else None,
    )
