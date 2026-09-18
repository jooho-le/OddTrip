"""add trip D-1 reminder ledger

Revision ID: 20260918_02
Revises: 20260918_01
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_02"
down_revision: Union[str, None] = "20260918_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_reminders",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("trip_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=20), server_default="d1", nullable=False),
        sa.Column("trip_date", sa.Date(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("notification_id", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"], ondelete="SET NULL"),
        # 한 사람은 한 여행의 같은 출발일에 대해 한 번만 받는다. 스케줄러가
        # 여러 번 깨어나거나 외부 cron이 함께 돌아도 이 제약이 중복을 막는다.
        sa.UniqueConstraint("trip_id", "user_id", "kind", "trip_date", name="uq_trip_reminders_once"),
    )
    op.create_index("ix_trip_reminders_trip_id", "trip_reminders", ["trip_id"])
    op.create_index("ix_trip_reminders_user_id", "trip_reminders", ["user_id"])
    op.create_index("ix_trip_reminders_trip_date", "trip_reminders", ["trip_date"])


def downgrade() -> None:
    op.drop_table("trip_reminders")
