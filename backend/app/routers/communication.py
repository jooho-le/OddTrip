from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.chat import ChatReportIn
from ..schemas.communication import MatchRequestCreate
from ..services import communication_service

request_router = APIRouter()
match_router = APIRouter()
user_router = APIRouter()


@request_router.post("", response_model=dict)
async def create_match_request(
    body: MatchRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.create_match_request(db, user, body)
    return {"data": data.model_dump(by_alias=True), "error": None}


@request_router.get("/received", response_model=dict)
async def received_match_requests(
    status: str | None = Query(default=None, pattern="^(pending|accepted|rejected|cancelled|expired)$"),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.list_match_requests(
        db, user.id, direction="received", status=status, limit=limit
    )
    return {"data": [item.model_dump(by_alias=True) for item in data], "error": None}


@request_router.get("/sent", response_model=dict)
async def sent_match_requests(
    status: str | None = Query(default=None, pattern="^(pending|accepted|rejected|cancelled|expired)$"),
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.list_match_requests(
        db, user.id, direction="sent", status=status, limit=limit
    )
    return {"data": [item.model_dump(by_alias=True) for item in data], "error": None}


@request_router.get("/{request_id}", response_model=dict)
async def get_match_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.get_match_request(db, request_id, user.id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@request_router.post("/{request_id}/accept", response_model=dict)
async def accept_match_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, match = await communication_service.accept_match_request(db, request_id, user)
    await chat_connection_manager.send_to_users(
        {match.user_id, match.matched_user_id},
        {"event": "room.created", "data": data.model_dump(by_alias=True, mode="json")},
    )
    return {"data": data.model_dump(by_alias=True), "error": None}


@request_router.post("/{request_id}/reject", response_model=dict)
async def reject_match_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.respond_to_request(db, request_id, user, "reject")
    return {"data": data.model_dump(by_alias=True), "error": None}


@request_router.post("/{request_id}/cancel", response_model=dict)
async def cancel_match_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.respond_to_request(db, request_id, user, "cancel")
    return {"data": data.model_dump(by_alias=True), "error": None}


@match_router.post("/{match_id}/end", response_model=dict)
async def end_match(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, match = await communication_service.end_match(db, match_id, user.id)
    await chat_connection_manager.send_to_users(
        {match.user_id, match.matched_user_id},
        {"event": "match.ended", "data": data.model_dump(by_alias=True, mode="json")},
    )
    return {"data": data.model_dump(by_alias=True), "error": None}


@match_router.delete("/{match_id}", response_model=dict)
async def hide_match(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    state = await communication_service.hide_match(db, match_id, user.id)
    return {"data": {"matchId": state.match_id, "hiddenAt": state.hidden_at}, "error": None}


@user_router.post("/{user_id}/block", response_model=dict)
async def block_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, matches = await communication_service.block_user(db, user, user_id)
    for match in matches:
        await chat_connection_manager.send_to_users(
            {match.user_id, match.matched_user_id},
            {"event": "user.blocked", "data": {"matchId": match.id}},
        )
    return {"data": data.model_dump(by_alias=True), "error": None}


@user_router.delete("/{user_id}/block", response_model=dict)
async def unblock_user(
    user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.unblock_user(db, user.id, user_id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@user_router.post("/{user_id}/reports", response_model=dict)
async def report_user(
    user_id: str,
    body: ChatReportIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await communication_service.report_user(db, user, user_id, body)
    return {"data": data.model_dump(by_alias=True), "error": None}
