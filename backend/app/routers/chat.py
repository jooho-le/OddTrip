from datetime import datetime

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import async_session
from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.chat import ChatMessageCreate, ChatReadIn
from ..security import decode_access_token
from ..services import chat_service

router = APIRouter()
match_router = APIRouter()


@match_router.post("/{match_id}/chat-room", response_model=dict)
async def create_or_get_chat_room(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await chat_service.get_or_create_room(db, match_id, user.id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/rooms", response_model=dict)
async def get_chat_rooms(
    status: str | None = Query(default=None, pattern="^(active|closed)$"),
    before: datetime | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_before = await chat_service.list_rooms(
        db, user.id, status=status, before=before, limit=limit
    )
    return {
        "data": {
            "items": [item.model_dump(by_alias=True) for item in items],
            "nextBefore": next_before,
        },
        "error": None,
    }


@router.get("/rooms/{room_id}", response_model=dict)
async def get_chat_room(
    room_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await chat_service.get_room_detail(db, room_id, user.id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/rooms/{room_id}/messages", response_model=dict)
async def get_chat_messages(
    room_id: str,
    before_sequence: int | None = Query(default=None, alias="beforeSequence", ge=1),
    limit: int = Query(default=30, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_before_sequence = await chat_service.list_messages(
        db,
        room_id,
        user.id,
        before_sequence=before_sequence,
        limit=limit,
    )
    return {
        "data": {
            "items": [item.model_dump(by_alias=True) for item in items],
            "nextBeforeSequence": next_before_sequence,
        },
        "error": None,
    }


@router.post("/rooms/{room_id}/messages", response_model=dict)
async def send_chat_message(
    room_id: str,
    body: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, match, created = await chat_service.create_message(db, room_id, user.id, body)
    if created:
        await chat_connection_manager.send_to_users(
            {match.user_id, match.matched_user_id},
            {"event": "message.created", "data": data.model_dump(by_alias=True, mode="json")},
        )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.put("/rooms/{room_id}/read", response_model=dict)
async def read_chat_messages(
    room_id: str,
    body: ChatReadIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, match, changed = await chat_service.mark_read(
        db, room_id, user.id, body.last_read_sequence
    )
    if changed:
        await chat_connection_manager.send_to_users(
            {match.user_id, match.matched_user_id},
            {"event": "room.read", "data": data.model_dump(by_alias=True, mode="json")},
        )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await chat_service.get_total_unread_count(db, user.id)
    return {"data": {"count": count}, "error": None}


@router.websocket("/ws")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        user_id = decode_access_token(token)
        # Authenticate with a short-lived session. A WebSocket may stay open
        # for hours and must not hold a database session/connection that long.
        async with async_session() as db:
            user = await db.get(User, user_id)
            if not user:
                await websocket.close(code=4401, reason="Not authenticated")
                return
    except Exception:
        await websocket.close(code=4401, reason="Not authenticated")
        return

    await chat_connection_manager.connect(user_id, websocket)
    try:
        while True:
            event = await websocket.receive_json()
            if event.get("event") == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await chat_connection_manager.disconnect(user_id, websocket)
