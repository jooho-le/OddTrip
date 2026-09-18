"""add outward location sharing links

Revision ID: 20260918_03
Revises: 20260918_02
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_03"
down_revision: Union[str, None] = "20260918_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 좌표 컬럼이 없는 것은 실수가 아니다. 위치는 메모리 캐시에만 두고 이 표에는
    # 동의와 공유 사실만 남긴다.
    op.create_table(
        "location_shares",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=36), nullable=True),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=50), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("consented_at", sa.DateTime(), nullable=False),
        sa.Column("stopped_at", sa.DateTime(), nullable=True),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("token", name="uq_location_shares_token"),
    )
    op.create_index("ix_location_shares_user_id", "location_shares", ["user_id"])
    op.create_index("ix_location_shares_trip_id", "location_shares", ["trip_id"])
    op.create_index("ix_location_shares_token", "location_shares", ["token"])
    op.create_index("ix_location_shares_expires_at", "location_shares", ["expires_at"])
    op.create_index("ix_location_shares_user_expires", "location_shares", ["user_id", "expires_at"])


def downgrade() -> None:
    op.drop_table("location_shares")
