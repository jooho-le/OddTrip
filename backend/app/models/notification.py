import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Notification(Base):
    """One delivered notification for one user.

    Rows are written inside the same transaction as the state change that
    caused them, so a notification can never exist for an action that rolled
    back. The WebSocket push is best effort on top: a recipient who is offline
    still finds the row here on their next request.
    """

    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "match_request.received" | "match_request.accepted" | "match_request.rejected" | "match.ended"
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str | None] = mapped_column(String(500))
    # Client-side route the notification opens, e.g. "/matches?tab=received".
    link: Mapped[str | None] = mapped_column(String(300))
    payload_json: Mapped[dict | None] = mapped_column(JSON)
    read_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        # The list endpoint always reads "one user's rows, newest first".
        Index("ix_notifications_user_created", "user_id", "created_at"),
        # The badge count is read on every page load, so keep it off the table.
        Index(
            "ix_notifications_user_unread",
            "user_id",
            postgresql_where=text("read_at IS NULL AND deleted_at IS NULL"),
            sqlite_where=text("read_at IS NULL AND deleted_at IS NULL"),
        ),
    )
