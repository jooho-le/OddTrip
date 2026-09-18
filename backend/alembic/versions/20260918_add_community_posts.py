"""add community travel review posts, comments, reactions and drafts

Revision ID: 20260918_01
Revises: 20260915_02
Create Date: 2026-09-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_01"
down_revision: Union[str, None] = "20260915_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "community_posts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("author_id", sa.String(length=36), nullable=False),
        sa.Column("trip_id", sa.String(length=36), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("region", sa.String(length=30), nullable=True),
        sa.Column("tags_json", sa.JSON(), nullable=True),
        sa.Column("tags_text", sa.String(length=120), nullable=True),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("image_caption", sa.String(length=150), nullable=True),
        sa.Column("allow_comments", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["deleted_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_community_posts_author_id", "community_posts", ["author_id"])
    op.create_index("ix_community_posts_trip_id", "community_posts", ["trip_id"])
    op.create_index("ix_community_posts_created", "community_posts", ["created_at"])
    op.create_index("ix_community_posts_category_created", "community_posts", ["category", "created_at"])
    op.create_index("ix_community_posts_author_created", "community_posts", ["author_id", "created_at"])

    op.create_table(
        "community_comments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("post_id", sa.String(length=36), nullable=False),
        sa.Column("author_id", sa.String(length=36), nullable=False),
        sa.Column("body", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_by", sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["deleted_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_community_comments_post_id", "community_comments", ["post_id"])
    op.create_index("ix_community_comments_author_id", "community_comments", ["author_id"])
    op.create_index("ix_community_comments_post_created", "community_comments", ["post_id", "created_at"])

    op.create_table(
        "community_post_reactions",
        sa.Column("post_id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), primary_key=True),
        sa.Column("liked_at", sa.DateTime(), nullable=True),
        sa.Column("saved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_community_post_reactions_user_id", "community_post_reactions", ["user_id"])
    op.create_index("ix_community_reactions_post_liked", "community_post_reactions", ["post_id", "liked_at"])
    op.create_index("ix_community_reactions_user_saved", "community_post_reactions", ["user_id", "saved_at"])

    op.create_table(
        "community_drafts",
        sa.Column("user_id", sa.String(length=36), primary_key=True),
        sa.Column("draft_key", sa.String(length=80), primary_key=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=80), server_default="", nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("region", sa.String(length=30), nullable=True),
        sa.Column("tags_json", sa.JSON(), nullable=True),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("image_caption", sa.String(length=150), nullable=True),
        sa.Column("allow_comments", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_community_drafts_user_updated", "community_drafts", ["user_id", "updated_at"])


def downgrade() -> None:
    op.drop_table("community_drafts")
    op.drop_table("community_post_reactions")
    op.drop_table("community_comments")
    op.drop_table("community_posts")
