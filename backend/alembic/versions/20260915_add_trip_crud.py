"""add trip lifecycle fields and one-current-trip constraint

Revision ID: 20260915_02
Revises: 20260915_01
Create Date: 2026-09-15
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260915_02"
down_revision: Union[str, None] = "20260915_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trips", sa.Column("cancelled_at", sa.DateTime(), nullable=True))
    op.add_column("trips", sa.Column("cancelled_by", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_trips_cancelled_by_users", "trips", "users", ["cancelled_by"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_trips_cancelled_by", "trips", ["cancelled_by"])
    op.create_index(
        "uq_trips_active_match",
        "trips",
        ["match_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('planning', 'confirmed')"),
        sqlite_where=sa.text("status IN ('planning', 'confirmed')"),
    )


def downgrade() -> None:
    op.drop_index("uq_trips_active_match", table_name="trips")
    op.drop_index("ix_trips_cancelled_by", table_name="trips")
    op.drop_constraint("fk_trips_cancelled_by_users", "trips", type_="foreignkey")
    op.drop_column("trips", "cancelled_by")
    op.drop_column("trips", "cancelled_at")
