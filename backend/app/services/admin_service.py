"""관리자 권한 관리.

권한을 올리는 HTTP 엔드포인트는 두지 않는다. API로 승격할 수 있으면 그
경로 자체가 권한 상승 통로가 되므로, 승격은 서버에 접근할 수 있는 사람이
손으로 실행하는 동작으로 남긴다. CLI(`backend.app.cli`)가 그 입구다.
"""
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.chat import ChatMessage
from ..models.communication import MatchRequest, Report
from ..models.match import Match
from ..models.trip import ItineraryDay, ItineraryItem, Trip, TripAttraction
from ..models.user import User
from ..schemas.admin import (
    REPORT_CLOSED_STATUSES,
    AdminReportDetailOut,
    AdminReportOut,
    AdminReportPageOut,
    AdminReportPersonOut,
    AdminReportReviewIn,
    AdminStatsOut,
    AdminTripOut,
    AdminUserDetailOut,
    AdminUserOut,
)
from . import consent_service, notification_service

ROLE_ADMIN = "admin"
ROLE_USER = "user"


class AdminRoleError(Exception):
    """승격·강등을 진행할 수 없는 경우. CLI가 메시지를 그대로 출력한다."""


async def _find_active_user(db: AsyncSession, email: str) -> User:
    normalized = email.strip().lower()
    result = await db.execute(
        select(User).where(User.email == normalized, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        # 탈퇴 계정은 이메일이 NULL로 비워지므로 이 조회에 잡히지 않는다.
        raise AdminRoleError(f"{normalized} 계정을 찾을 수 없습니다.")
    return user


async def list_admins(db: AsyncSession) -> list[User]:
    result = await db.execute(
        select(User)
        .where(User.role == ROLE_ADMIN, User.deleted_at.is_(None))
        .order_by(User.created_at)
    )
    return list(result.scalars().all())


async def promote(db: AsyncSession, email: str) -> User:
    """계정을 관리자로 올린다. 이미 관리자면 아무것도 하지 않는다."""
    user = await _find_active_user(db, email)
    if user.role == ROLE_ADMIN:
        return user
    user.role = ROLE_ADMIN
    await db.commit()
    await db.refresh(user)
    return user


async def demote(db: AsyncSession, email: str) -> User:
    """관리자 권한을 회수한다.

    마지막 한 명은 내리지 않는다. 관리자가 0명이 되면 다시 올릴 방법이
    서버 접근밖에 남지 않아, 운영 중에 스스로를 잠그는 사고가 된다.
    """
    user = await _find_active_user(db, email)
    if user.role != ROLE_ADMIN:
        return user

    admins = await list_admins(db)
    if len(admins) <= 1:
        raise AdminRoleError("마지막 관리자는 강등할 수 없습니다.")

    user.role = ROLE_USER
    await db.commit()
    await db.refresh(user)
    return user


# --- 운영 조회 -------------------------------------------------------------
#
# 집계는 전부 group by 한 번으로 모아서 행에 붙인다. 목록 한 줄마다 count를
# 따로 세면 회원 20명 조회에 질의가 40번 나간다.


def _user_status(user: User) -> str:
    return "withdrawn" if user.deleted_at else "active"


async def _match_counts(db: AsyncSession, user_ids: list[str]) -> dict[str, int]:
    if not user_ids:
        return {}
    counts: dict[str, int] = {}
    for column in (Match.user_id, Match.matched_user_id):
        result = await db.execute(
            select(column, func.count())
            .where(column.in_(user_ids), Match.deleted_at.is_(None))
            .group_by(column)
        )
        for user_id, count in result.all():
            counts[user_id] = counts.get(user_id, 0) + count
    return counts


async def _trip_counts(db: AsyncSession, user_ids: list[str]) -> dict[str, int]:
    """사용자별 여행 수. 여행은 매칭에 달려 있으므로 매칭을 거쳐 센다."""
    if not user_ids:
        return {}
    counts: dict[str, int] = {}
    for column in (Match.user_id, Match.matched_user_id):
        result = await db.execute(
            select(column, func.count(Trip.id))
            .join(Trip, Trip.match_id == Match.id)
            .where(column.in_(user_ids), Match.deleted_at.is_(None))
            .group_by(column)
        )
        for user_id, count in result.all():
            counts[user_id] = counts.get(user_id, 0) + count
    return counts


async def list_users(
    db: AsyncSession,
    *,
    query: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[AdminUserOut], int]:
    conditions = []
    if query:
        like = f"%{query.strip().lower()}%"
        conditions.append(
            func.lower(User.nickname).like(like)
            | func.lower(func.coalesce(User.email, "")).like(like)
            | func.lower(func.coalesce(User.tti_code, "")).like(like)
        )
    if status == "active":
        conditions.append(User.deleted_at.is_(None))
    elif status == "withdrawn":
        conditions.append(User.deleted_at.isnot(None))

    total = (await db.execute(
        select(func.count()).select_from(User).where(*conditions)
    )).scalar_one()

    rows = list((await db.execute(
        select(User).where(*conditions).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )).scalars().all())

    ids = [row.id for row in rows]
    matches = await _match_counts(db, ids)
    trips = await _trip_counts(db, ids)

    return [
        AdminUserOut(
            id=row.id,
            nickname=row.nickname,
            email=row.email,
            region=row.home_region,
            tti_code=row.tti_code,
            joined_at=row.created_at,
            status=_user_status(row),
            role=row.role,
            matches=matches.get(row.id, 0),
            trips=trips.get(row.id, 0),
        )
        for row in rows
    ], total


async def get_user(db: AsyncSession, user_id: str) -> AdminUserDetailOut:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    matches = await _match_counts(db, [user.id])
    trips = await _trip_counts(db, [user.id])
    consent_status = await consent_service.status(db, user.id)

    return AdminUserDetailOut(
        id=user.id,
        nickname=user.nickname,
        email=user.email,
        region=user.home_region,
        tti_code=user.tti_code,
        joined_at=user.created_at,
        status=_user_status(user),
        role=user.role,
        matches=matches.get(user.id, 0),
        trips=trips.get(user.id, 0),
        withdrawn_at=user.deleted_at,
        consents={item.type: item.accepted for item in consent_status.items},
    )


async def _trip_rows(db: AsyncSession, trips: list[Trip]) -> list[AdminTripOut]:
    if not trips:
        return []
    trip_ids = [trip.id for trip in trips]

    attractions = dict((await db.execute(
        select(TripAttraction.trip_id, func.count())
        .where(TripAttraction.trip_id.in_(trip_ids))
        .group_by(TripAttraction.trip_id)
    )).all())

    items = dict((await db.execute(
        select(ItineraryDay.trip_id, func.count(ItineraryItem.id))
        .join(ItineraryItem, ItineraryItem.day_id == ItineraryDay.id)
        .where(ItineraryDay.trip_id.in_(trip_ids))
        .group_by(ItineraryDay.trip_id)
    )).all())

    # 여행 참여자는 매칭 양쪽이다. 닉네임만 모아 한 번에 읽는다.
    pairs = (await db.execute(
        select(Trip.id, User.nickname)
        .join(Match, Match.id == Trip.match_id)
        .join(User, (User.id == Match.user_id) | (User.id == Match.matched_user_id))
        .where(Trip.id.in_(trip_ids))
    )).all()
    travelers: dict[str, list[str]] = {}
    for trip_id, nickname in pairs:
        travelers.setdefault(trip_id, []).append(nickname)

    return [
        AdminTripOut(
            id=trip.id,
            title=trip.title,
            region=trip.region,
            start_date=trip.start_date,
            end_date=trip.end_date,
            status=trip.status,
            travelers=travelers.get(trip.id, []),
            attractions=attractions.get(trip.id, 0),
            itinerary_items=items.get(trip.id, 0),
            created_at=trip.created_at,
        )
        for trip in trips
    ]


async def list_trips(
    db: AsyncSession,
    *,
    query: str | None = None,
    status: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[AdminTripOut], int]:
    conditions = []
    if query:
        like = f"%{query.strip().lower()}%"
        conditions.append(
            func.lower(func.coalesce(Trip.title, "")).like(like)
            | func.lower(func.coalesce(Trip.region, "")).like(like)
            | func.lower(Trip.id).like(like)
        )
    if status:
        conditions.append(Trip.status == status)

    total = (await db.execute(
        select(func.count()).select_from(Trip).where(*conditions)
    )).scalar_one()

    trips = list((await db.execute(
        select(Trip).where(*conditions).order_by(Trip.created_at.desc()).limit(limit).offset(offset)
    )).scalars().all())

    return await _trip_rows(db, trips), total


async def get_trip(db: AsyncSession, trip_id: str) -> AdminTripOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    rows = await _trip_rows(db, [trip])
    return rows[0]


async def stats(db: AsyncSession) -> AdminStatsOut:
    async def count(stmt) -> int:
        return (await db.execute(stmt)).scalar_one()

    total_users = await count(select(func.count()).select_from(User))
    withdrawn = await count(
        select(func.count()).select_from(User).where(User.deleted_at.isnot(None))
    )
    total_trips = await count(select(func.count()).select_from(Trip))
    active_trips = await count(
        select(func.count()).select_from(Trip).where(Trip.status.in_(("planning", "confirmed")))
    )
    total_matches = await count(
        select(func.count()).select_from(Match).where(Match.deleted_at.is_(None))
    )

    answered = await count(
        select(func.count())
        .select_from(MatchRequest)
        .where(MatchRequest.status.in_(("accepted", "rejected")))
    )
    accepted = await count(
        select(func.count()).select_from(MatchRequest).where(MatchRequest.status == "accepted")
    )
    tti_done = await count(
        select(func.count())
        .select_from(User)
        .where(User.tti_code.isnot(None), User.deleted_at.is_(None))
    )
    active_users = total_users - withdrawn

    distribution = [
        {"code": code, "count": value}
        for code, value in (await db.execute(
            select(User.tti_code, func.count())
            .where(User.tti_code.isnot(None), User.deleted_at.is_(None))
            .group_by(User.tti_code)
            .order_by(func.count().desc())
        )).all()
    ]

    return AdminStatsOut(
        total_users=total_users,
        active_users=active_users,
        withdrawn_users=withdrawn,
        total_trips=total_trips,
        active_trips=active_trips,
        total_matches=total_matches,
        # 응답이 없는 요청은 분모에서 뺀다. 아직 답하지 않은 건을 거절로 세면
        # 성사율이 시간이 갈수록 실제보다 낮게 보인다.
        match_acceptance_rate=round(accepted / answered * 100, 1) if answered else 0.0,
        tti_completion_rate=round(tti_done / active_users * 100, 1) if active_users else 0.0,
        tti_distribution=distribution,
    )


# --- 신고 처리 -------------------------------------------------------------


def _person(user: User | None, fallback_id: str) -> AdminReportPersonOut:
    if not user:
        # 사용자 행이 사라진 경우에도 신고 자체는 남아 있어야 한다.
        return AdminReportPersonOut(id=fallback_id, nickname="알 수 없음", status="unknown")
    return AdminReportPersonOut(
        id=user.id,
        nickname=user.nickname,
        email=user.email,
        status=_user_status(user),
    )


async def _received_counts(db: AsyncSession, user_ids: list[str]) -> dict[str, int]:
    """피신고자별 누적 신고 수. 제재 수위는 반복성을 함께 보고 정한다."""
    if not user_ids:
        return {}
    result = await db.execute(
        select(Report.reported_user_id, func.count())
        .where(Report.reported_user_id.in_(user_ids), Report.deleted_at.is_(None))
        .group_by(Report.reported_user_id)
    )
    return dict(result.all())


async def _report_rows(db: AsyncSession, reports: list[Report]) -> list[AdminReportOut]:
    if not reports:
        return []

    user_ids = {r.reporter_id for r in reports} | {r.reported_user_id for r in reports}
    users = {
        user.id: user
        for user in (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars()
    }
    counts = await _received_counts(db, [r.reported_user_id for r in reports])

    return [
        AdminReportOut(
            id=report.id,
            reason=report.reason,
            details=report.details,
            status=report.status,
            reporter=_person(users.get(report.reporter_id), report.reporter_id),
            reported_user=_person(users.get(report.reported_user_id), report.reported_user_id),
            room_id=report.room_id,
            message_id=report.message_id,
            reported_user_report_count=counts.get(report.reported_user_id, 0),
            reviewed_by=report.reviewed_by,
            reviewed_at=report.reviewed_at,
            review_note=report.review_note,
            created_at=report.created_at,
        )
        for report in reports
    ]


async def list_reports(
    db: AsyncSession,
    *,
    status: str | None = None,
    reason: str | None = None,
    reported_user_id: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> AdminReportPageOut:
    conditions = [Report.deleted_at.is_(None)]
    if status:
        conditions.append(Report.status == status)
    if reason:
        conditions.append(Report.reason == reason)
    if reported_user_id:
        conditions.append(Report.reported_user_id == reported_user_id)

    total = (await db.execute(
        select(func.count()).select_from(Report).where(*conditions)
    )).scalar_one()

    # 미처리 건수는 필터와 무관하게 센다. 운영자가 "처리함"만 보고 있어도
    # 남은 일이 몇 건인지는 계속 보여야 한다.
    pending = (await db.execute(
        select(func.count())
        .select_from(Report)
        .where(Report.deleted_at.is_(None), Report.status == "pending")
    )).scalar_one()

    reports = list((await db.execute(
        select(Report)
        .where(*conditions)
        # 오래된 신고가 먼저 처리되어야 하므로 미처리는 접수 순으로 올린다.
        .order_by(
            case((Report.status == "pending", 0), else_=1),
            Report.created_at.asc(),
        )
        .limit(limit)
        .offset(offset)
    )).scalars().all())

    return AdminReportPageOut(
        items=await _report_rows(db, reports), total=total, pending=pending
    )


async def get_report(db: AsyncSession, report_id: str) -> AdminReportDetailOut:
    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다.")

    base = (await _report_rows(db, [report]))[0]

    message_content = None
    if report.message_id:
        message = await db.get(ChatMessage, report.message_id)
        # 지워진 메시지는 원문을 보여주지 않는다. 다만 신고 자체는 남는다.
        if message and not message.deleted_at:
            message_content = message.content

    related = list((await db.execute(
        select(Report)
        .where(
            Report.reported_user_id == report.reported_user_id,
            Report.id != report.id,
            Report.deleted_at.is_(None),
        )
        .order_by(Report.created_at.desc())
        .limit(20)
    )).scalars().all())

    return AdminReportDetailOut(
        **base.model_dump(),
        message_content=message_content,
        related_reports=await _report_rows(db, related),
    )


async def review_report(
    db: AsyncSession,
    report_id: str,
    admin: User,
    body: AdminReportReviewIn,
) -> AdminReportDetailOut:
    """검토 결과를 남긴다. 제재 자체는 별도 동작이다."""
    report = await db.get(Report, report_id)
    if not report or report.deleted_at:
        raise HTTPException(status_code=404, detail="신고를 찾을 수 없습니다.")

    was_open = report.status not in REPORT_CLOSED_STATUSES
    now = datetime.utcnow()
    report.status = body.status
    report.reviewed_by = admin.id
    report.reviewed_at = now
    if body.note is not None:
        report.review_note = body.note.strip() or None

    notification = None
    if was_open and body.status in REPORT_CLOSED_STATUSES:
        # 신고자에게는 처리되었다는 사실만 알린다. 어떤 제재가 내려졌는지는
        # 피신고자의 정보라 신고자에게 공개할 것이 아니다.
        notification = notification_service.build(
            user_id=report.reporter_id,
            type=notification_service.REPORT_REVIEWED,
            title="신고 처리가 완료되었어요",
            body="접수하신 신고 검토가 끝났습니다. 처리 결과는 운영정책에 따라 개별 안내되지 않습니다.",
            link="/my",
            payload={"reportId": report.id},
        )
        db.add(notification)

    await db.commit()
    if notification:
        await notification_service.push([notification])

    return await get_report(db, report_id)
