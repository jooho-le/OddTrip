"""여행 시작 하루 전 리마인더.

여행 시작일은 사용자가 달력에서 고른 한국 날짜다. 서버 시각은 UTC라, D-1을 UTC로
계산하면 한국 시간 오전 9시 이전에 하루가 어긋난다. 그래서 "언제 보낼지"는 KST로
판단하고 저장은 기존 표들과 같은 naive UTC로 한다.

발송 자체는 멱등하다. 스케줄러가 몇 번을 깨어나든, 외부 cron이 같이 돌든,
한 사람은 한 여행의 같은 출발일에 대해 한 번만 받는다.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.notification import Notification
from ..models.reminder import TripReminder
from ..models.trip import Trip
from ..models.user import User
from . import notification_service

logger = logging.getLogger(__name__)

KST = timezone(timedelta(hours=9))
KIND_D1 = "d1"
# 리마인더를 보낼 여행 상태. 취소되었거나 이미 끝난 여행은 알리지 않는다.
REMINDABLE_STATUSES = ("planning", "confirmed")


def _now() -> datetime:
    return datetime.utcnow()


def to_kst(moment: datetime) -> datetime:
    """naive UTC 시각을 KST로 옮긴다."""
    return moment.replace(tzinfo=timezone.utc).astimezone(KST)


def due_trip_date(now: datetime, send_hour: int) -> date | None:
    """지금 알려야 할 여행 시작일. 아직 발송 시각 전이면 None.

    오전 9시로 정했다면 한국 시각 9시부터 자정까지가 발송 구간이다. 그 사이
    아무 때나 한 번 실행되면 되므로, 서버가 9시에 잠들어 있었어도 깨어난 김에
    보낸다. 자정을 넘기면 그날이 여행 당일이라 D-1 알림은 의미가 없어 보내지 않는다.
    """
    now_kst = to_kst(now)
    if now_kst.hour < send_hour:
        return None
    return now_kst.date() + timedelta(days=1)


def _trip_label(trip: Trip) -> str:
    for value in (trip.region, trip.title):
        if value and value.strip():
            return value.strip()
    return ""


def _reminder_title(trip: Trip) -> str:
    """제목에 쓸 한 줄. 지역이 없으면 여행 이름을 쓴다.

    이름이 이미 "…여행"으로 끝나면 뒤에 '여행'을 또 붙이지 않는다.
    """
    label = _trip_label(trip)
    if not label:
        return "내일 여행이 시작돼요"
    if label.endswith("여행"):
        return f"내일 {label}이 시작돼요"
    return f"내일 {label} 여행이 시작돼요"


def _build_notification(trip: Trip, user_id: str, partner: User | None) -> Notification:
    title = _reminder_title(trip)
    body = "일정과 준비물을 미리 확인해 보세요."
    if partner:
        body = f"{partner.nickname}님과 함께하는 여행이에요. " + body
    return notification_service.build(
        user_id=user_id,
        type=notification_service.TRIP_REMINDER_D1,
        title=title,
        body=body,
        link=f"/trips/{trip.id}/schedule",
        payload={
            "tripId": trip.id,
            "startDate": trip.start_date.isoformat() if trip.start_date else None,
            "kind": KIND_D1,
        },
    )


async def send_due_reminders(
    db: AsyncSession, *, now: datetime | None = None, send_hour: int = 9
) -> list[Notification]:
    """보낼 때가 된 D-1 알림을 만들어 저장한다.

    돌려주는 알림 행은 이미 커밋된 것이다. 실시간 전송은 호출자가
    ``notification_service.push``로 이어서 한다. 소켓 전송이 실패해도 알림함에는
    남아 있어야 하므로 저장과 전송을 나눠 둔다.
    """
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

    trip_ids = [trip.id for trip, _ in rows]
    already = {
        (reminder.trip_id, reminder.user_id)
        for reminder in (
            await db.execute(
                select(TripReminder).where(
                    TripReminder.trip_id.in_(trip_ids),
                    TripReminder.kind == KIND_D1,
                    TripReminder.trip_date == target_date,
                )
            )
        ).scalars()
    }

    user_ids = {match.user_id for _, match in rows} | {match.matched_user_id for _, match in rows}
    users = {
        user.id: user
        for user in (
            await db.execute(select(User).where(User.id.in_(user_ids), User.deleted_at.is_(None)))
        ).scalars()
    }

    sent: list[Notification] = []
    for trip, match in rows:
        for user_id, partner_id in ((match.user_id, match.matched_user_id), (match.matched_user_id, match.user_id)):
            # 탈퇴한 계정에는 보내지 않는다. 상대가 탈퇴했더라도 남은 사람의
            # 여행은 그대로이므로 동행 이름만 빼고 보낸다.
            if user_id not in users or (trip.id, user_id) in already:
                continue
            notification = _build_notification(trip, user_id, users.get(partner_id))
            try:
                # 유일 제약에 걸리면 다른 실행이 먼저 보낸 것이다. 그 한 건만
                # 되돌리고 나머지는 계속 보낸다.
                async with db.begin_nested():
                    db.add(notification)
                    db.add(
                        TripReminder(
                            trip_id=trip.id,
                            user_id=user_id,
                            kind=KIND_D1,
                            trip_date=target_date,
                            sent_at=moment,
                            notification_id=notification.id,
                        )
                    )
                    await db.flush()
            except IntegrityError:
                continue
            sent.append(notification)

    await db.commit()
    if sent:
        logger.info("D-1 리마인더 %d건 발송 (출발일 %s)", len(sent), target_date)
    return sent
