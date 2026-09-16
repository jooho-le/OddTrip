"""add revision-aware itinerary approvals

Revision ID: 20260915_01
Revises: 20260908_01
Create Date: 2026-09-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260915_01"
down_revision: Union[str, None] = "20260908_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("itinerary_revision", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.create_table(
        "trip_approvals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("itinerary_revision", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("comment", sa.String(length=500), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "trip_id", "user_id", "itinerary_revision",
            name="uq_trip_approvals_trip_user_revision",
        ),
    )
    op.create_index("ix_trip_approvals_trip_id", "trip_approvals", ["trip_id"])
    op.create_index("ix_trip_approvals_user_id", "trip_approvals", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_trip_approvals_user_id", table_name="trip_approvals")
    op.drop_index("ix_trip_approvals_trip_id", table_name="trip_approvals")
    op.drop_table("trip_approvals")
    op.drop_column("trips", "itinerary_revision")
