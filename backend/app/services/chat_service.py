import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.chat import ChatMessage, ChatReadState, ChatRoom
from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..schemas.chat import (
    ChatCounterpartOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatReadOut,
    ChatRoomOut,
    ChatTripOut,
)


def _now() -> datetime:
    return datetime.utcnow()


async def get_match_for_user(db: AsyncSession, match_id: str, user_id: str) -> Match:
    result = await db.execute(
        select(Match).where(
            Match.id == match_id,
            or_(Match.user_id == user_id, Match.matched_user_id == user_id),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        # Do not reveal whether another user's match exists.
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    return match


async def get_room_for_user(db: AsyncSession, room_id: str, user_id: str, *, lock: bool = False) -> tuple[ChatRoom, Match]:
    query = (
        select(ChatRoom, Match)
        .join(Match, Match.id == ChatRoom.match_id)
        .where(
            ChatRoom.id == room_id,
            or_(Match.user_id == user_id, Match.matched_user_id == user_id),
        )
    )
    if lock:
        query = query.with_for_update(of=ChatRoom)
    result = await db.execute(query)
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="채팅방을 찾을 수 없습니다.")
    return row[0], row[1]


async def get_or_create_room(db: AsyncSession, match_id: str, user_id: str) -> ChatRoomOut:
    match = await get_match_for_user(db, match_id, user_id)
    existing = await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))
    room = existing.scalar_one_or_none()

    if not room:
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
            ChatReadState(room_id=room.id, user_id=match.user_id, last_read_sequence=0, updated_at=now),
            ChatReadState(room_id=room.id, user_id=match.matched_user_id, last_read_sequence=0, updated_at=now),
        ])
        try:
            await db.commit()
        except IntegrityError:
            # Another request may have created the unique match room first.
            await db.rollback()
            result = await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))
            room = result.scalar_one_or_none()
            if not room:
                raise

            # rollback expires ORM instances; reload the match before its
            # attributes are used to build the response.
            match = await get_match_for_user(db, match_id, user_id)

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
        .where(or_(Match.user_id == user_id, Match.matched_user_id == user_id))
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
        last_room = rows[-1][0]
        next_before = last_room.last_message_at or last_room.created_at
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
    next_before = messages[0].sequence if has_more and messages else None
    return [message_to_out(message) for message in messages], next_before


async def create_message(
    db: AsyncSession,
    room_id: str,
    user_id: str,
    body: ChatMessageCreate,
) -> tuple[ChatMessageOut, Match, bool]:
    existing = await db.execute(
        select(ChatMessage).where(
            ChatMessage.sender_id == user_id,
            ChatMessage.client_message_id == body.client_message_id,
        )
    )
    duplicate = existing.scalar_one_or_none()
    if duplicate:
        if duplicate.room_id != room_id:
            raise HTTPException(status_code=409, detail="이미 다른 채팅방에서 사용한 clientMessageId입니다.")
        _, match = await get_room_for_user(db, room_id, user_id)
        return message_to_out(duplicate), match, False

    room, match = await get_room_for_user(db, room_id, user_id, lock=True)
    if room.status != "active":
        raise HTTPException(status_code=409, detail="종료된 채팅방에는 메시지를 보낼 수 없습니다.")

    sequence = room.next_sequence
    now = _now()
    message = ChatMessage(
        id=str(uuid.uuid4()),
        room_id=room.id,
        sender_id=user_id,
        sequence=sequence,
        client_message_id=body.client_message_id,
        type=body.type,
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
        result = await db.execute(
            select(ChatMessage).where(
                ChatMessage.sender_id == user_id,
                ChatMessage.client_message_id == body.client_message_id,
            )
        )
        duplicate = result.scalar_one_or_none()
        if duplicate and duplicate.room_id == room_id:
            _, match = await get_room_for_user(db, room_id, user_id)
            return message_to_out(duplicate), match, False
        raise
    return message_to_out(message), match, True


async def mark_read(
    db: AsyncSession,
    room_id: str,
    user_id: str,
    requested_sequence: int,
) -> tuple[ChatReadOut, Match, bool]:
    room, match = await get_room_for_user(db, room_id, user_id, lock=True)
    latest_sequence = max(room.next_sequence - 1, 0)
    target = min(requested_sequence, latest_sequence)
    state = await db.get(ChatReadState, (room_id, user_id))
    now = _now()
    if not state:
        state = ChatReadState(
            room_id=room_id,
            user_id=user_id,
            last_read_sequence=target,
            updated_at=now,
        )
        db.add(state)
        changed = True
    else:
        changed = target > state.last_read_sequence
        if changed:
            state.last_read_sequence = target
            state.updated_at = now
    if changed:
        await db.commit()
    return ChatReadOut.model_validate(state), match, changed


async def get_total_unread_count(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(ChatMessage.id))
        .join(ChatRoom, ChatRoom.id == ChatMessage.room_id)
        .join(Match, Match.id == ChatRoom.match_id)
        .outerjoin(
            ChatReadState,
            (ChatReadState.room_id == ChatRoom.id) & (ChatReadState.user_id == user_id),
        )
        .where(
            or_(Match.user_id == user_id, Match.matched_user_id == user_id),
            ChatMessage.sender_id != user_id,
            ChatMessage.deleted_at.is_(None),
            ChatMessage.sequence > func.coalesce(ChatReadState.last_read_sequence, 0),
        )
    )
    return int(result.scalar_one())


async def build_room_out(db: AsyncSession, room: ChatRoom, match: Match, user_id: str) -> ChatRoomOut:
    counterpart_id = match.matched_user_id if match.user_id == user_id else match.user_id
    counterpart = await db.get(User, counterpart_id)
    if not counterpart:
        raise HTTPException(status_code=404, detail="상대 사용자 정보를 찾을 수 없습니다.")

    trip_result = await db.execute(select(Trip).where(Trip.match_id == match.id))
    trip = trip_result.scalar_one_or_none()

    last_message = None
    if room.last_message_id:
        message = await db.get(ChatMessage, room.last_message_id)
        if message:
            last_message = message_to_out(message)

    read_state = await db.get(ChatReadState, (room.id, user_id))
    last_read = read_state.last_read_sequence if read_state else 0
    unread_result = await db.execute(
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
        current_step=trip.status if trip else None,
        last_message=last_message,
        unread_count=int(unread_result.scalar_one()),
        created_at=room.created_at,
        updated_at=room.updated_at,
    )


def message_to_out(message: ChatMessage) -> ChatMessageOut:
    return ChatMessageOut(
        id=message.id,
        room_id=message.room_id,
        sender_id=message.sender_id,
        sequence=message.sequence,
        client_message_id=message.client_message_id,
        type=message.type,
        content=None if message.deleted_at else message.content,
        payload=message.payload_json,
        created_at=message.created_at,
        deleted_at=message.deleted_at,
    )
