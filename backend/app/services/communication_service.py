import uuid
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.chat import ChatRoom, ChatRoomMember
from ..models.communication import Block, MatchRequest, MatchUserState, Report
from ..models.match import Match
from ..models.notification import Notification
from ..models.trip import Trip
from ..models.user import User
from ..schemas.chat import ChatReportIn, ChatReportOut
from ..schemas.communication import (
    BlockOut,
    MatchAcceptOut,
    MatchEndOut,
    MatchRequestCreate,
    MatchRequestOut,
)
from ..schemas.user import UserOut
from . import chat_service, match_service, notification_service
from .match_service import _calc_score, _count_opposite_axes


def _now() -> datetime:
    return datetime.utcnow()


def _require_tti(user: User) -> None:
    if not user.tti_code or not user.tti_scores_json:
        raise HTTPException(status_code=409, detail="TTI 진단을 완료한 사용자만 매칭할 수 있습니다.")


async def _get_request_for_user(
    db: AsyncSession, request_id: str, user_id: str, *, lock: bool = False
) -> MatchRequest:
    query = select(MatchRequest).where(
        MatchRequest.id == request_id,
        MatchRequest.deleted_at.is_(None),
        or_(MatchRequest.requester_id == user_id, MatchRequest.receiver_id == user_id),
    )
    if lock:
        query = query.with_for_update()
    request = (await db.execute(query)).scalar_one_or_none()
    if not request:
        raise HTTPException(status_code=404, detail="매칭 요청을 찾을 수 없습니다.")
    return request


async def create_match_request(
    db: AsyncSession, requester: User, body: MatchRequestCreate
) -> MatchRequestOut:
    if requester.id == body.receiver_id:
        raise HTTPException(status_code=400, detail="자기 자신에게 매칭을 요청할 수 없습니다.")
    _require_tti(requester)
    receiver = await db.get(User, body.receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")
    _require_tti(receiver)
    if await chat_service.are_users_blocked(db, requester.id, receiver.id):
        raise HTTPException(status_code=409, detail="매칭을 요청할 수 없는 사용자입니다.")

    existing_match = (await db.execute(
        select(Match).where(
            Match.deleted_at.is_(None),
            or_(
                (Match.user_id == requester.id) & (Match.matched_user_id == receiver.id),
                (Match.user_id == receiver.id) & (Match.matched_user_id == requester.id),
            ),
        )
    )).scalar_one_or_none()
    if existing_match:
        raise HTTPException(status_code=409, detail="이미 매칭 이력이 있는 사용자입니다.")

    pending = (await db.execute(
        select(MatchRequest).where(
            MatchRequest.status == "pending",
            MatchRequest.deleted_at.is_(None),
            or_(
                (MatchRequest.requester_id == requester.id) & (MatchRequest.receiver_id == receiver.id),
                (MatchRequest.requester_id == receiver.id) & (MatchRequest.receiver_id == requester.id),
            ),
        )
    )).scalar_one_or_none()
    if pending:
        raise HTTPException(status_code=409, detail="이미 응답 대기 중인 매칭 요청이 있습니다.")

    now = _now()
    request = MatchRequest(
        id=str(uuid.uuid4()),
        requester_id=requester.id,
        receiver_id=receiver.id,
        region=body.region,
        start_date=body.start_date,
        end_date=body.end_date,
        greeting_message=body.greeting_message,
        status="pending",
        expires_at=now + timedelta(days=7),
        created_at=now,
        updated_at=now,
    )
    db.add(request)
    # The receiver has no other way to learn about this: the request expires in
    # seven days and nothing else surfaces it outside /matches?tab=received.
    notification = notification_service.build(
        user_id=receiver.id,
        type=notification_service.MATCH_REQUEST_RECEIVED,
        title=f"{requester.nickname}님이 동행을 요청했어요",
        body=request.greeting_message,
        link="/matches?tab=received",
        payload={"requestId": request.id, "requesterId": requester.id},
    )
    db.add(notification)
    await db.commit()
    await notification_service.push([notification])
    return _request_out(request, requester, receiver, requester.id)


async def list_match_requests(
    db: AsyncSession,
    user_id: str,
    *,
    direction: str,
    status: str | None,
    limit: int,
) -> list[MatchRequestOut]:
    user_column = MatchRequest.receiver_id if direction == "received" else MatchRequest.requester_id
    query = (
        select(MatchRequest)
        .where(user_column == user_id, MatchRequest.deleted_at.is_(None))
        .order_by(MatchRequest.created_at.desc())
        .limit(limit)
    )
    if status:
        query = query.where(MatchRequest.status == status)
    requests = list((await db.execute(query)).scalars().all())
    now = _now()
    expired_any = False
    for request in requests:
        if request.status == "pending" and request.expires_at and request.expires_at < now:
            request.status = "expired"
            request.responded_at = now
            expired_any = True
    if expired_any:
        await db.commit()
    result = []
    for request in requests:
        counterpart_id = request.requester_id if direction == "received" else request.receiver_id
        requester = await db.get(User, request.requester_id)
        receiver = await db.get(User, request.receiver_id)
        if requester and receiver:
            result.append(_request_out(request, requester, receiver, user_id))
    return result


async def get_match_request(db: AsyncSession, request_id: str, user_id: str) -> MatchRequestOut:
    request = await _get_request_for_user(db, request_id, user_id)
    if request.status == "pending" and request.expires_at and request.expires_at < _now():
        request.status = "expired"
        request.responded_at = _now()
        await db.commit()
    requester = await db.get(User, request.requester_id)
    receiver = await db.get(User, request.receiver_id)
    if not requester or not receiver:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")
    return _request_out(request, requester, receiver, user_id)


async def accept_match_request(db: AsyncSession, request_id: str, user: User) -> tuple[MatchAcceptOut, Match]:
    request = await _get_request_for_user(db, request_id, user.id, lock=True)
    if request.receiver_id != user.id:
        raise HTTPException(status_code=404, detail="매칭 요청을 찾을 수 없습니다.")
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="응답할 수 없는 매칭 요청입니다.")
    now = _now()
    if request.expires_at and request.expires_at < now:
        request.status = "expired"
        request.responded_at = now
        await db.commit()
        raise HTTPException(status_code=409, detail="만료된 매칭 요청입니다.")

    requester = await db.get(User, request.requester_id)
    receiver = await db.get(User, request.receiver_id)
    if not requester or not receiver:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")
    _require_tti(requester)
    _require_tti(receiver)
    if await chat_service.are_users_blocked(db, requester.id, receiver.id):
        raise HTTPException(status_code=409, detail="차단 관계에서는 매칭을 수락할 수 없습니다.")

    existing = (await db.execute(
        select(Match).where(
            or_(
                (Match.user_id == requester.id) & (Match.matched_user_id == receiver.id),
                (Match.user_id == receiver.id) & (Match.matched_user_id == requester.id),
            )
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="이미 매칭된 사용자입니다.")

    count, diff_axes = _count_opposite_axes(requester.tti_code, receiver.tti_code)
    score = _calc_score(count, requester.tti_scores_json, receiver.tti_scores_json)
    differences = [match_service.AXIS_LABELS[axis] for axis in diff_axes]
    complements: list[str] = []
    for axis in diff_axes:
        complements.extend(match_service.COMPLEMENT_TEMPLATES.get(axis, []))

    match = Match(
        id=str(uuid.uuid4()),
        user_id=requester.id,
        matched_user_id=receiver.id,
        status="active",
        user_tti_code_snapshot=requester.tti_code,
        matched_user_tti_code_snapshot=receiver.tti_code,
        user_tti_scores_snapshot_json=requester.tti_scores_json,
        matched_user_tti_scores_snapshot_json=receiver.tti_scores_json,
        match_level={4: "완전 반대", 3: "부분 반대"}.get(count, "추천"),
        recommendation_score=min(score, 100),
        compatibility=f"{requester.nickname}님과 {receiver.nickname}님의 여행 스타일이 상호보완적입니다.",
        differences_json=differences,
        complements_json=complements[:4],
        created_at=now,
        updated_at=now,
    )
    db.add(match)
    await db.flush()
    room = await chat_service.provision_room(
        db,
        match,
        greeting_message=request.greeting_message,
        greeting_sender_id=requester.id,
    )
    trip = Trip(
        id=str(uuid.uuid4()),
        match_id=match.id,
        region=request.region,
        start_date=request.start_date,
        end_date=request.end_date,
        status="planning",
    )
    db.add(trip)
    db.add_all([
        MatchUserState(match_id=match.id, user_id=requester.id, created_at=now, updated_at=now),
        MatchUserState(match_id=match.id, user_id=receiver.id, created_at=now, updated_at=now),
    ])
    request.status = "accepted"
    request.responded_at = now
    request.updated_at = now
    # Only the requester needs telling. The receiver just pressed accept and is
    # redirected into the room by the client.
    notification = notification_service.build(
        user_id=requester.id,
        type=notification_service.MATCH_REQUEST_ACCEPTED,
        title=f"{receiver.nickname}님이 동행 요청을 수락했어요",
        body="채팅방과 여행 공간이 함께 열렸어요.",
        link=f"/chat/{room.id}",
        payload={
            "requestId": request.id,
            "matchId": match.id,
            "roomId": room.id,
            "tripId": trip.id,
        },
    )
    db.add(notification)
    await db.commit()
    await notification_service.push([notification])
    return MatchAcceptOut(
        request_id=request.id,
        match_id=match.id,
        room_id=room.id,
        trip_id=trip.id,
        user_ids=[requester.id, receiver.id],
    ), match


async def respond_to_request(db: AsyncSession, request_id: str, user: User, action: str) -> MatchRequestOut:
    request = await _get_request_for_user(db, request_id, user.id, lock=True)
    if request.status != "pending":
        raise HTTPException(status_code=409, detail="응답할 수 없는 매칭 요청입니다.")
    if action == "reject" and request.receiver_id != user.id:
        raise HTTPException(status_code=404, detail="매칭 요청을 찾을 수 없습니다.")
    if action == "cancel" and request.requester_id != user.id:
        raise HTTPException(status_code=404, detail="매칭 요청을 찾을 수 없습니다.")
    request.status = "rejected" if action == "reject" else "cancelled"
    request.responded_at = _now()

    requester = await db.get(User, request.requester_id)
    receiver = await db.get(User, request.receiver_id)
    if not requester or not receiver:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")

    # Cancelling is the requester withdrawing their own request, so there is
    # nothing to tell them. Rejection is the one the requester is waiting on.
    notifications: list[Notification] = []
    if action == "reject":
        notifications.append(
            notification_service.build(
                user_id=requester.id,
                type=notification_service.MATCH_REQUEST_REJECTED,
                title=f"{receiver.nickname}님이 동행 요청을 거절했어요",
                body="다른 동행 후보를 찾아보세요.",
                link="/matches?tab=sent",
                payload={"requestId": request.id, "receiverId": receiver.id},
            )
        )
        db.add_all(notifications)

    await db.commit()
    await notification_service.push(notifications)
    return _request_out(request, requester, receiver, user.id)


async def end_match(db: AsyncSession, match_id: str, user_id: str) -> tuple[MatchEndOut, Match]:
    match = await chat_service.get_match_for_user(db, match_id, user_id)
    if match.status == "ended":
        ended_at = match.ended_at or match.updated_at
        room = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))).scalar_one_or_none()
        return MatchEndOut(match_id=match.id, room_id=room.id if room else None, status="ended", ended_at=ended_at), match
    now = _now()
    room = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))).scalar_one_or_none()
    if room:
        await chat_service.create_system_message(
            db=db,
            match_id=match.id,
            event="match.ended",
            content="매칭이 종료되었습니다.",
        )
        room.status = "closed"
        room.closed_at = now
    match.status = "ended"
    match.ended_at = now
    state = await db.get(MatchUserState, (match.id, user_id))
    if state:
        state.left_at = now

    # The system message that goes into the room carries sender_id=NULL, so it
    # never lands on the unread badge. Without this the other side only finds
    # out by opening the chat list.
    counterpart_id = match.matched_user_id if match.user_id == user_id else match.user_id
    actor = await db.get(User, user_id)
    notification = notification_service.build(
        user_id=counterpart_id,
        type=notification_service.MATCH_ENDED,
        title="매칭이 종료되었어요",
        body=f"{actor.nickname}님과의 매칭이 종료되었습니다." if actor else None,
        link="/matches",
        payload={"matchId": match.id, "roomId": room.id if room else None},
    )
    db.add(notification)
    await db.commit()
    await notification_service.push([notification])
    return MatchEndOut(match_id=match.id, room_id=room.id if room else None, status="ended", ended_at=now), match


async def hide_match(db: AsyncSession, match_id: str, user_id: str) -> MatchUserState:
    await chat_service.get_match_for_user(db, match_id, user_id)
    state = await db.get(MatchUserState, (match_id, user_id))
    if not state:
        state = MatchUserState(match_id=match_id, user_id=user_id, created_at=_now(), updated_at=_now())
        db.add(state)
    if not state.hidden_at:
        state.hidden_at = _now()
    room = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match_id))).scalar_one_or_none()
    if room:
        member = await db.get(ChatRoomMember, (room.id, user_id))
        if member and not member.hidden_at:
            member.hidden_at = state.hidden_at
    await db.commit()
    return state


async def block_user(db: AsyncSession, blocker: User, blocked_user_id: str) -> tuple[BlockOut, list[Match]]:
    if blocker.id == blocked_user_id:
        raise HTTPException(status_code=400, detail="자기 자신을 차단할 수 없습니다.")
    if not await db.get(User, blocked_user_id):
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    existing = (await db.execute(
        select(Block).where(
            Block.blocker_id == blocker.id,
            Block.blocked_user_id == blocked_user_id,
            Block.released_at.is_(None),
            Block.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if existing:
        return BlockOut.model_validate(existing), []
    now = _now()
    block = Block(id=str(uuid.uuid4()), blocker_id=blocker.id, blocked_user_id=blocked_user_id, created_at=now)
    db.add(block)
    matches = list((await db.execute(
        select(Match).where(
            Match.status == "active",
            Match.deleted_at.is_(None),
            or_(
                (Match.user_id == blocker.id) & (Match.matched_user_id == blocked_user_id),
                (Match.user_id == blocked_user_id) & (Match.matched_user_id == blocker.id),
            ),
        )
    )).scalars().all())
    for match in matches:
        match.status = "ended"
        match.ended_at = now
        room = (await db.execute(select(ChatRoom).where(ChatRoom.match_id == match.id))).scalar_one_or_none()
        if room:
            room.status = "closed"
            room.closed_at = now
    await db.commit()
    return BlockOut.model_validate(block), matches


async def unblock_user(db: AsyncSession, blocker_id: str, blocked_user_id: str) -> BlockOut:
    block = (await db.execute(
        select(Block).where(
            Block.blocker_id == blocker_id,
            Block.blocked_user_id == blocked_user_id,
            Block.released_at.is_(None),
            Block.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not block:
        raise HTTPException(status_code=404, detail="차단 정보를 찾을 수 없습니다.")
    block.released_at = _now()
    await db.commit()
    return BlockOut.model_validate(block)


async def report_user(
    db: AsyncSession, reporter: User, reported_user_id: str, body: ChatReportIn
) -> ChatReportOut:
    if reporter.id == reported_user_id:
        raise HTTPException(status_code=400, detail="자기 자신을 신고할 수 없습니다.")
    if not await db.get(User, reported_user_id):
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    now = _now()
    report = Report(
        id=str(uuid.uuid4()),
        reporter_id=reporter.id,
        reported_user_id=reported_user_id,
        reason=body.reason,
        details=body.details.strip() if body.details else None,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(report)
    await db.commit()
    return ChatReportOut.model_validate(report)


def _request_out(
    request: MatchRequest,
    requester: User,
    receiver: User,
    viewer_id: str,
) -> MatchRequestOut:
    count, diff_axes = _count_opposite_axes(requester.tti_code or "", receiver.tti_code or "")
    score = _calc_score(
        count,
        requester.tti_scores_json or [],
        receiver.tti_scores_json,
    )
    differences = [match_service.AXIS_LABELS[axis] for axis in diff_axes]
    complements: list[str] = []
    for axis in diff_axes:
        complements.extend(match_service.COMPLEMENT_TEMPLATES.get(axis, []))
    counterpart = receiver if viewer_id == requester.id else requester
    return MatchRequestOut(
        id=request.id,
        requester_id=request.requester_id,
        receiver_id=request.receiver_id,
        region=request.region,
        start_date=request.start_date,
        end_date=request.end_date,
        greeting_message=request.greeting_message,
        status=request.status,
        expires_at=request.expires_at,
        responded_at=request.responded_at,
        created_at=request.created_at,
        requester=UserOut.model_validate(requester),
        receiver=UserOut.model_validate(receiver),
        counterpart=UserOut.model_validate(counterpart),
        match_level={4: "완전 반대", 3: "부분 반대"}.get(count, "추천"),
        recommendation_score=min(score, 100),
        differences=differences,
        complements=complements[:4],
    )
