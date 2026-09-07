import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class MatchRequest(Base):
    __tablename__ = "match_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    requester_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    receiver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    greeting_message: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))

    __table_args__ = (
        CheckConstraint("requester_id <> receiver_id", name="ck_match_requests_not_self"),
        CheckConstraint("start_date <= end_date", name="ck_match_requests_date_range"),
        Index(
            "uq_match_requests_pending_pair",
            "requester_id",
            "receiver_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND status = 'pending'"),
            sqlite_where=text("deleted_at IS NULL AND status = 'pending'"),
        ),
        Index("ix_match_requests_requester_status", "requester_id", "status"),
        Index("ix_match_requests_receiver_status", "receiver_id", "status"),
    )


class MatchUserState(Base):
    __tablename__ = "match_user_states"

    match_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("matches.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime)
    left_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    blocker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    blocked_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    released_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))

    __table_args__ = (
        CheckConstraint("blocker_id <> blocked_user_id", name="ck_blocks_not_self"),
        Index(
            "uq_blocks_active_pair",
            "blocker_id",
            "blocked_user_id",
            unique=True,
            postgresql_where=text("released_at IS NULL AND deleted_at IS NULL"),
            sqlite_where=text("released_at IS NULL AND deleted_at IS NULL"),
        ),
    )


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reported_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    room_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("chat_rooms.id", ondelete="SET NULL"), index=True
    )
    message_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("chat_messages.id", ondelete="SET NULL"), index=True
    )
    reason: Mapped[str] = mapped_column(String(30), nullable=False)
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending")
    reviewed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        Index(
            "uq_reports_active_message_reporter",
            "reporter_id",
            "message_id",
            unique=True,
            postgresql_where=text("message_id IS NOT NULL AND deleted_at IS NULL"),
            sqlite_where=text("message_id IS NOT NULL AND deleted_at IS NULL"),
        ),
        Index("ix_reports_status_created", "status", "created_at"),
    )
