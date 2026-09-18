"""여행 리마인더.

두 가지를 보낸다. 여행 시작 하루 전의 준비 안내(D-1)와, 여행이 끝난 다음 날의
후기 작성 권유다. 둘 다 "언제 보낼지"는 KST로 판단한다. 여행 날짜는 사용자가
달력에서 고른 한국 날짜인데 서버 시각은 UTC라, UTC로 계산하면 한국 시간 오전 9시
이전에 하루가 어긋난다. 저장은 다른 표들과 같은 naive UTC로 한다.

발송은 멱등하다. 스케줄러가 몇 번을 깨어나든, 외부 cron이 같이 돌든, 한 사람은
한 여행의 같은 기준일에 대해 한 번만 받는다.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.community import CommunityPost
from ..models.match import Match
from ..models.notification import Notification
from ..models.reminder import TripReminder
from ..models.trip import Trip
from ..models.user import User
from . import notification_service

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
KIND_D1 = "d1"
KIND_REVIEW = "review"
# D-1을 보낼 여행 상태. 취소되었거나 이미 끝난 여행은 출발을 알리지 않는다.
REMINDABLE_STATUSES = ("planning", "confirmed")
# 후기는 다녀온 여행에 쓰는 것이라 취소된 여행만 뺀다. 끝난 여행의 상태를
# completed로 바꾸는 절차가 아직 없어 confirmed로 남아 있는 여행도 대상이다.
REVIEW_EXCLUDED_STATUSES = ("cancelled",)


def _now() -> datetime:
    return datetime.utcnow()


def to_kst(moment: datetime) -> datetime:
    """naive UTC 시각을 KST로 옮긴다."""
    return moment.replace(tzinfo=timezone.utc).astimezone(KST)


def _past_send_hour(now: datetime, send_hour: int) -> date | None:
    """발송 시각을 지났으면 그때의 한국 날짜, 아니면 None.

    오전 9시로 정했다면 한국 시각 9시부터 자정까지가 발송 구간이다. 그 사이
    아무 때나 한 번 실행되면 되므로, 서버가 9시에 잠들어 있었어도 깨어난 김에
    보낸다. 자정을 넘기면 하루가 지난 알림이라 보내지 않는다.
    """
    now_kst = to_kst(now)
    return None if now_kst.hour < send_hour else now_kst.date()


def due_trip_date(now: datetime, send_hour: int) -> date | None:
    """지금 D-1을 알려야 할 여행 시작일(내일)."""
    today = _past_send_hour(now, send_hour)
    return today + timedelta(days=1) if today else None


def due_review_date(now: datetime, send_hour: int) -> date | None:
    """지금 후기를 권할 여행 종료일(어제).

    마지막 날에 묻지 않는 것은 그날이 아직 여행 중이기 때문이다. 돌아온 다음 날
    아침이 기억도 남아 있고 앉아서 쓸 여유도 있는 시점이다.
    """
    today = _past_send_hour(now, send_hour)
    return today - timedelta(days=1) if today else None


def _trip_label(trip: Trip) -> str:
    for value in (trip.region, trip.title):
        if value and value.strip():
            return value.strip()
    return ""


def _trip_phrase(trip: Trip) -> str:
    """제목에 넣을 여행 이름. 이미 "…여행"으로 끝나면 '여행'을 또 붙이지 않는다."""
    label = _trip_label(trip)
    if not label:
        return "여행"
    return label if label.endswith("여행") else f"{label} 여행"


def _d1_notification(trip: Trip, user_id: str, partner: User | None) -> Notification:
    body = "일정과 준비물을 미리 확인해 보세요."
    if partner:
        body = f"{partner.nickname}님과 함께하는 여행이에요. " + body
    return notification_service.build(
        user_id=user_id,
        type=notification_service.TRIP_REMINDER_D1,
        title=f"내일 {_trip_phrase(trip)}이 시작돼요",
        body=body,
        link=f"/trips/{trip.id}/schedule",
        payload={
            "tripId": trip.id,
            "startDate": trip.start_date.isoformat() if trip.start_date else None,
            "kind": KIND_D1,
        },
    )


def _review_notification(trip: Trip, user_id: str, partner: User | None) -> Notification:
    body = "여행 이야기를 남기면 다음 여행자에게 큰 도움이 돼요."
    if partner:
        body = f"{partner.nickname}님과의 시간을 기록해 보세요. " + body
    return notification_service.build(
        user_id=user_id,
        type=notification_service.TRIP_REVIEW_REMINDER,
        title=f"{_trip_phrase(trip)}은 어떠셨어요?",
        body=body,
        # 여행 정보를 채운 글쓰기 화면으로 바로 들어간다. 초안을 저장해 둔
        # 상태라면 그 초안을 이어 쓴다.
        link=f"/community/write?draft=trip:{trip.id}",
        payload={
            "tripId": trip.id,
            "endDate": trip.end_date.isoformat() if trip.end_date else None,
            "kind": KIND_REVIEW,
        },
    )


async def _load_users(db: AsyncSession, rows: list[tuple[Trip, Match]]) -> dict[str, User]:
    user_ids = {match.user_id for _, match in rows} | {match.matched_user_id for _, match in rows}
    return {
        user.id: user
        for user in (
            await db.execute(select(User).where(User.id.in_(user_ids), User.deleted_at.is_(None)))
        ).scalars()
    }


async def _already_sent(
    db: AsyncSession, trip_ids: list[str], kind: str, target_date: date
) -> set[tuple[str, str]]:
    return {
        (reminder.trip_id, reminder.user_id)
        for reminder in (
            await db.execute(
                select(TripReminder).where(
                    TripReminder.trip_id.in_(trip_ids),
                    TripReminder.kind == kind,
                    TripReminder.trip_date == target_date,
                )
            )
        ).scalars()
    }


async def _record(
    db: AsyncSession,
    *,
    trip_id: str,
    user_id: str,
    kind: str,
    target_date: date,
    notification: Notification,
    moment: datetime,
) -> bool:
    """알림과 발송 기록을 함께 남긴다. 다른 실행이 이미 보냈으면 False."""
    try:
        # 유일 제약에 걸리면 그 한 건만 되돌리고 나머지는 계속 보낸다.
        async with db.begin_nested():
            db.add(notification)
            db.add(
                TripReminder(
                    trip_id=trip_id,
                    user_id=user_id,
                    kind=kind,
                    trip_date=target_date,
                    sent_at=moment,
                    notification_id=notification.id,
                )
            )
            await db.flush()
    except IntegrityError:
        return False
    return True


def _pairs(match: Match) -> tuple[tuple[str, str], tuple[str, str]]:
    """(받는 사람, 동행) 두 쌍."""
    return (match.user_id, match.matched_user_id), (match.matched_user_id, match.user_id)


async def send_d1_reminders(
    db: AsyncSession, *, now: datetime | None = None, send_hour: int = 9
) -> list[Notification]:
    """내일 시작하는 여행을 알린다."""
    moment = now or _now()
    target_date = due_trip_date(moment, send_hour)
    if target_date is None:
        return []

    rows = (
        await db.execute(
            select(Trip, Match)
            .join(Match, Match.id == Trip.match_id)
            .where(
                Trip.start_date == target_date,
                Trip.status.in_(REMINDABLE_STATUSES),
                Match.deleted_at.is_(None),
            )
        )
    ).all()
    if not rows:
        return []

    already = await _already_sent(db, [trip.id for trip, _ in rows], KIND_D1, target_date)
    users = await _load_users(db, rows)

    sent: list[Notification] = []
    for trip, match in rows:
        for user_id, partner_id in _pairs(match):
            # 탈퇴한 계정에는 보내지 않는다. 상대가 탈퇴했더라도 남은 사람의
            # 여행은 그대로이므로 동행 이름만 빼고 보낸다.
            if user_id not in users or (trip.id, user_id) in already:
                continue
            notification = _d1_notification(trip, user_id, users.get(partner_id))
            if await _record(
                db, trip_id=trip.id, user_id=user_id, kind=KIND_D1,
                target_date=target_date, notification=notification, moment=moment,
            ):
                sent.append(notification)

    await db.commit()
    if sent:
        logger.info("여행 D-1 리마인더 %d건 발송 (출발일 %s)", len(sent), target_date)
    return sent


async def send_review_reminders(
    db: AsyncSession, *, now: datetime | None = None, send_hour: int = 9
) -> list[Notification]:
    """어제 끝난 여행의 후기를 권한다.

    이미 그 여행으로 후기를 쓴 사람에게는 보내지 않는다. 쓴 사람에게 또 쓰라고
    하는 알림은 알림함만 채운다.
    """
    moment = now or _now()
    target_date = due_review_date(moment, send_hour)
    if target_date is None:
        return []

    rows = (
        await db.execute(
            select(Trip, Match)
            .join(Match, Match.id == Trip.match_id)
            .where(
                Trip.end_date == target_date,
                Trip.status.not_in(REVIEW_EXCLUDED_STATUSES),
                Match.deleted_at.is_(None),
            )
        )
    ).all()
    if not rows:
        return []

    trip_ids = [trip.id for trip, _ in rows]
    already = await _already_sent(db, trip_ids, KIND_REVIEW, target_date)
    written = {
        (post.trip_id, post.author_id)
        for post in (
            await db.execute(
                select(CommunityPost).where(
                    CommunityPost.trip_id.in_(trip_ids),
                    CommunityPost.deleted_at.is_(None),
                )
            )
        ).scalars()
    }
    users = await _load_users(db, rows)

    sent: list[Notification] = []
    for trip, match in rows:
        for user_id, partner_id in _pairs(match):
            if user_id not in users or (trip.id, user_id) in already or (trip.id, user_id) in written:
                continue
            notification = _review_notification(trip, user_id, users.get(partner_id))
            if await _record(
                db, trip_id=trip.id, user_id=user_id, kind=KIND_REVIEW,
                target_date=target_date, notification=notification, moment=moment,
            ):
                sent.append(notification)

    await db.commit()
    if sent:
        logger.info("여행 후기 리마인더 %d건 발송 (종료일 %s)", len(sent), target_date)
    return sent


async def send_due_reminders(
    db: AsyncSession, *, now: datetime | None = None, send_hour: int = 9
) -> list[Notification]:
    """스케줄러와 CLI가 부르는 자리. 보낼 때가 된 리마인더를 모두 보낸다.

    돌려주는 알림 행은 이미 커밋된 것이다. 실시간 전송은 호출자가
    ``notification_service.push``로 이어서 한다. 소켓 전송이 실패해도 알림함에는
    남아 있어야 하므로 저장과 전송을 나눠 둔다.
    """
    moment = now or _now()
    return [
        *await send_d1_reminders(db, now=moment, send_hour=send_hour),
        *await send_review_reminders(db, now=moment, send_hour=send_hour),
    ]
