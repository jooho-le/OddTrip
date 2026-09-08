"""add per-user trip preferences

Revision ID: 20260908_01
Revises:
Create Date: 2026-09-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260908_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_user_preferences",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("preferences_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "user_id", name="uq_trip_user_preferences_trip_user"),
    )
    op.create_index("ix_trip_user_preferences_trip_id", "trip_user_preferences", ["trip_id"])
    op.create_index("ix_trip_user_preferences_user_id", "trip_user_preferences", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_trip_user_preferences_user_id", table_name="trip_user_preferences")
    op.drop_index("ix_trip_user_preferences_trip_id", table_name="trip_user_preferences")
    op.drop_table("trip_user_preferences")
