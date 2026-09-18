"""앱 안에서 도는 예약 작업.

별도 스케줄러(cron, Celery)를 두지 않은 이유는 배포 형태 때문이다. 웹 서비스
하나로 돌아가는 환경에서는 예약 작업만을 위해 인스턴스를 더 띄우기 어렵다.
대신 발송 자체를 멱등하게 만들어 두었으므로, 나중에 cron으로 옮기거나 두 방식을
함께 써도 알림이 두 번 가지 않는다(`python -m backend.app.cli reminders`).

주기적으로 깨어나 "보낼 때가 되었는지" 확인만 한다. 잠들어 있던 사이에 발송
시각이 지났더라도 그날 안이면 따라잡는다.
"""
import asyncio
import logging

from .config import settings
from .database import async_session
from .services import notification_service, reminder_service

logger = logging.getLogger(__name__)


async def run_reminder_loop(stop: asyncio.Event) -> None:
    interval = max(1, settings.reminder_check_interval_minutes) * 60
    logger.info("여행 리마인더 스케줄러 시작 (%d분 간격)", settings.reminder_check_interval_minutes)
    while not stop.is_set():
        try:
            async with async_session() as db:
                notifications = await reminder_service.send_due_reminders(
                    db, send_hour=settings.reminder_send_hour_kst
                )
            # 저장과 실시간 전송을 나눈다. 소켓이 끊겨 있어도 알림함에는 남는다.
            await notification_service.push(notifications)
        except asyncio.CancelledError:
            raise
        except Exception:
            # 한 번 실패했다고 스케줄러가 죽으면 다음 여행도 못 알린다.
            logger.exception("여행 리마인더 발송에 실패했습니다")

        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue
