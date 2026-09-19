"""add concession, odd rule and password reset records

Revision ID: 20260919_01
Revises: 20260918_03
Create Date: 2026-09-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260919_01"
down_revision: Union[str, None] = "20260918_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trip_concession_responses",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("trip_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("answers_json", sa.JSON(), nullable=False),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("revealed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("trip_id", "user_id", name="uq_trip_concessions_trip_user"),
    )
    op.create_index("ix_trip_concession_responses_trip_id", "trip_concession_responses", ["trip_id"])
    op.create_index("ix_trip_concession_responses_user_id", "trip_concession_responses", ["user_id"])

    op.create_table(
        "trip_odd_rule_proposals",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("trip_id", sa.String(length=36), nullable=False),
        sa.Column("proposed_by", sa.String(length=36), nullable=False),
        sa.Column("responded_by", sa.String(length=36), nullable=True),
        sa.Column("rule_key", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["proposed_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["responded_by"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("trip_id", "version", name="uq_trip_odd_rules_trip_version"),
    )
    op.create_index("ix_trip_odd_rule_proposals_trip_id", "trip_odd_rule_proposals", ["trip_id"])
    op.create_index("ix_trip_odd_rule_proposals_proposed_by", "trip_odd_rule_proposals", ["proposed_by"])
    op.create_index("ix_trip_odd_rule_proposals_responded_by", "trip_odd_rule_proposals", ["responded_by"])
    op.create_index(
        "uq_trip_odd_rules_pending_proposer",
        "trip_odd_rule_proposals",
        ["trip_id", "proposed_by"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
        sqlite_where=sa.text("status = 'pending'"),
    )

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)
    op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_table("trip_odd_rule_proposals")
    op.drop_table("trip_concession_responses")
