import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.notification import Notification
from ..models.trip import ItineraryDay, Trip, TripApproval
from ..models.user import User
from ..schemas.approval import ApprovalActionIn, ApprovalParticipantOut, ApprovalStateOut
from . import notification_service

APPROVED = "approved"
CHANGE_REQUESTED = "change_requested"


async def get_state(
    db: AsyncSession, trip: Trip, user_id: str
) -> ApprovalStateOut:
    match, mine, counterpart = await _participants(db, trip, user_id)
    rows = (await db.execute(
        select(TripApproval).where(
            TripApproval.trip_id == trip.id,
            TripApproval.itinerary_revision == trip.itinerary_revision,
            TripApproval.user_id.in_((match.user_id, match.matched_user_id)),
        )
    )).scalars().all()
    by_user = {row.user_id: row for row in rows}
    all_approved = all(
        by_user.get(member_id) is not None and by_user[member_id].status == APPROVED
        for member_id in (match.user_id, match.matched_user_id)
    )
    return ApprovalStateOut(
        trip_id=trip.id,
        itinerary_revision=trip.itinerary_revision,
        trip_status=trip.status,
        all_approved=all_approved,
        mine=_participant_out(mine, by_user.get(mine.id)),
        counterpart=_participant_out(counterpart, by_user.get(counterpart.id)),
    )


async def respond(
    db: AsyncSession,
    trip_id: str,
    user_id: str,
    body: ApprovalActionIn,
) -> tuple[ApprovalStateOut, list[Notification], Match]:
    # Serialize an approval against itinerary regeneration and the other
    # traveller's response. PostgreSQL honours this lock; SQLite test runs
    # safely ignore it.
    trip = (await db.execute(
        select(Trip).where(Trip.id == trip_id).with_for_update()
    )).scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    if trip.status in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail="종료되거나 취소된 여행의 일정에는 응답할 수 없습니다.")

    day_count = int((await db.execute(
        select(func.count(ItineraryDay.id)).where(ItineraryDay.trip_id == trip.id)
    )).scalar_one())
    if day_count == 0:
        raise HTTPException(status_code=409, detail="먼저 일정을 생성해주세요.")

    match, mine, counterpart = await _participants(db, trip, user_id)
    if match.status != "active":
        raise HTTPException(status_code=409, detail="종료된 매칭에서는 일정에 응답할 수 없습니다.")

    row = (await db.execute(
        select(TripApproval).where(
            TripApproval.trip_id == trip.id,
            TripApproval.user_id == user_id,
            TripApproval.itinerary_revision == trip.itinerary_revision,
        )
    )).scalar_one_or_none()
    now = datetime.utcnow()
    status = APPROVED if body.action == "approve" else CHANGE_REQUESTED
    if row and row.status == status and row.comment == body.comment:
        return await get_state(db, trip, user_id), [], match
    if row:
        row.status = status
        row.comment = body.comment
        row.approved_at = now if status == APPROVED else None
        row.updated_at = now
    else:
        row = TripApproval(
            id=str(uuid.uuid4()),
            trip_id=trip.id,
            user_id=user_id,
            itinerary_revision=trip.itinerary_revision,
            status=status,
            comment=body.comment,
            approved_at=now if status == APPROVED else None,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    await db.flush()

    approved_ids = set((await db.execute(
        select(TripApproval.user_id).where(
            TripApproval.trip_id == trip.id,
            TripApproval.itinerary_revision == trip.itinerary_revision,
            TripApproval.status == APPROVED,
            TripApproval.user_id.in_((match.user_id, match.matched_user_id)),
        )
    )).scalars().all())
    all_approved = approved_ids == {match.user_id, match.matched_user_id}
    trip.status = "confirmed" if all_approved else "planning"

    if all_approved:
        event_type = notification_service.ITINERARY_CONFIRMED
        title = "두 사람의 일정 승인이 완료됐어요"
        message = "확정된 일정을 여행 전에 다시 확인해 주세요."
    elif status == APPROVED:
        event_type = notification_service.ITINERARY_APPROVED
        title = f"{mine.nickname}님이 일정을 승인했어요"
        message = "내가 승인하면 공동 일정이 최종 확정됩니다."
    else:
        event_type = notification_service.ITINERARY_CHANGE_REQUESTED
        title = f"{mine.nickname}님이 일정 수정을 요청했어요"
        message = body.comment

    notification = notification_service.build(
        user_id=counterpart.id,
        type=event_type,
        title=title,
        body=message,
        link="/trip/schedule",
        payload={
            "tripId": trip.id,
            "itineraryRevision": trip.itinerary_revision,
            "status": status,
        },
    )
    db.add(notification)
    await db.commit()
    await db.refresh(trip)
    return await get_state(db, trip, user_id), [notification], match


async def _participants(
    db: AsyncSession, trip: Trip, user_id: str
) -> tuple[Match, User, User]:
    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    if user_id == match.user_id:
        mine_id, counterpart_id = match.user_id, match.matched_user_id
    elif user_id == match.matched_user_id:
        mine_id, counterpart_id = match.matched_user_id, match.user_id
    else:
        raise HTTPException(status_code=403, detail="이 여행의 참여자가 아닙니다.")
    users = (await db.execute(
        select(User).where(User.id.in_((mine_id, counterpart_id)))
    )).scalars().all()
    by_id = {user.id: user for user in users}
    if mine_id not in by_id or counterpart_id not in by_id:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")
    return match, by_id[mine_id], by_id[counterpart_id]


def _participant_out(user: User, row: TripApproval | None) -> ApprovalParticipantOut:
    return ApprovalParticipantOut(
        user_id=user.id,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        status=row.status if row else "pending",
        comment=row.comment if row else None,
        approved_at=row.approved_at if row else None,
        updated_at=row.updated_at if row else None,
    )
