import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class TripReminder(Base):
    """여행 리마인더를 한 사람에게 한 번 보냈다는 기록.

    발송 여부를 알림 표에서 되짚지 않고 여기에 남기는 이유는 중복 때문이다.
    스케줄러는 주기적으로 깨어나고, 배포 인스턴스가 둘이거나 외부 cron이 함께
    돌 수도 있다. 유일 제약이 있어야 같은 여행·같은 사람에게 두 번 가지 않는다.

    trip_date를 키에 넣는 것은 여행 날짜가 바뀌는 경우 때문이다. 9월 20일 출발로
    한 번 알렸더라도 출발이 9월 25일로 밀리면 새 D-1에 다시 알려야 한다.
    """

    __tablename__ = "trip_reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 지금은 "d1" 하나뿐이다. 당일 아침이나 D-3이 생기면 같은 표에 종류만 는다.
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="d1", server_default="d1")
    # 알림을 보낼 때 기준이 된 여행 시작일.
    trip_date: Mapped[date] = mapped_column(Date, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    # 감사를 위해 어떤 알림 행으로 나갔는지 남긴다. 알림이 지워져도 기록은 남는다.
    notification_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("notifications.id", ondelete="SET NULL")
    )

    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", "kind", "trip_date", name="uq_trip_reminders_once"),
        Index("ix_trip_reminders_trip_date", "trip_date"),
    )
