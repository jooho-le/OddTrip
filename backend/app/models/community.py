import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

# 화면(src/features/community/communityModel.ts)의 CATEGORIES와 같은 값이다.
# 한쪽만 바뀌면 작성 화면이 저장할 수 없는 카테고리를 고르게 되므로 함께 고친다.
CATEGORIES = ("여행기", "여행 팁", "질문", "동행 후기")


class CommunityPost(Base):
    """게시된 여행 후기 한 건.

    후기는 여행에서 출발하지만 여행 기록 자체는 아니다. 여행이 취소되거나
    지워져도 후기는 남아야 하므로 trip_id는 선택값이고 SET NULL로 끊는다.
    """

    __tablename__ = "community_posts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # "이 여행으로 글쓰기"로 들어온 후기가 어느 여행에서 나왔는지. 화면이 아직
    # 보내지 않아도 되도록 선택값으로 둔다.
    trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="SET NULL"), index=True
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(80), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    region: Mapped[str | None] = mapped_column(String(30))
    tags_json: Mapped[list | None] = mapped_column(JSON)
    # 태그 검색용 사본. 목록 검색은 제목·본문·지역·태그를 한 번에 훑는데,
    # JSON 컬럼 안을 LIKE로 뒤지는 문법은 Postgres와 SQLite가 서로 다르다.
    # 쓰기 시점에 한 줄로 합쳐 두면 두 DB에서 같은 질의가 돈다.
    tags_text: Mapped[str | None] = mapped_column(String(120))
    # 현재 화면은 800KB 이하 사진 한 장을 data URL로 보낸다. 업로드·스토리지
    # 계약(docs/COMMUNITY_FRONTEND.md P1)이 정해지면 여기는 파일 URL만 남기고
    # 본문 바이트는 스토리지로 옮긴다.
    image: Mapped[str | None] = mapped_column(Text)
    image_caption: Mapped[str | None] = mapped_column(String(150))
    allow_comments: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))

    __table_args__ = (
        # 목록은 언제나 "삭제되지 않은 글, 최신순"으로 읽는다.
        Index("ix_community_posts_created", "created_at"),
        # 카테고리 탭과 "내 글" 보기.
        Index("ix_community_posts_category_created", "category", "created_at"),
        Index("ix_community_posts_author_created", "author_id", "created_at"),
    )


class CommunityComment(Base):
    """후기에 달린 댓글.

    글이 지워지면 댓글도 함께 사라진다(CASCADE). 댓글만 지우는 경우는
    deleted_at으로 남겨 신고·운영 검토에서 원문을 확인할 수 있게 둔다.
    """

    __tablename__ = "community_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    deleted_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"))

    __table_args__ = (Index("ix_community_comments_post_created", "post_id", "created_at"),)


class CommunityPostReaction(Base):
    """한 사용자가 한 글에 남긴 공감·저장 상태.

    공감과 저장을 표 하나에 둔 이유는 목록 질의 때문이다. 표가 둘이면 글 목록에
    조인이 둘 붙지만, 한 사람이 한 글에 갖는 상태는 어차피 한 행이다.
    취소는 행을 지우는 대신 시각을 비운다. 다시 누른 사람과 한 번도 누르지
    않은 사람을 구분할 수 있어야 나중에 추천 지표를 만들 때 쓸 수 있다.
    """

    __tablename__ = "community_post_reactions"

    post_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("community_posts.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    liked_at: Mapped[datetime | None] = mapped_column(DateTime)
    saved_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # 공감 수 집계와 공감순 정렬.
        Index("ix_community_reactions_post_liked", "post_id", "liked_at"),
        # "저장한 글" 보기.
        Index("ix_community_reactions_user_saved", "user_id", "saved_at"),
    )


class CommunityDraft(Base):
    """작성 중인 후기 초안.

    키는 화면이 쓰는 값을 그대로 받는다. 새 글은 "new", 수정 초안은 글 id,
    여행에서 시작한 글은 "trip:<tripId>"다. 계정당 키 하나에 초안 하나이므로
    (user_id, draft_key)가 기본키다.

    초안은 완성 전 상태라 제목·본문이 비어 있을 수 있다. 게시 검증은 발행할 때
    하고 여기서는 길이 상한만 지킨다.
    """

    __tablename__ = "community_drafts"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    draft_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(80), nullable=False, default="", server_default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    region: Mapped[str | None] = mapped_column(String(30))
    tags_json: Mapped[list | None] = mapped_column(JSON)
    image: Mapped[str | None] = mapped_column(Text)
    image_caption: Mapped[str | None] = mapped_column(String(150))
    allow_comments: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # 임시저장 목록은 최근에 고친 순서로 읽는다.
        Index("ix_community_drafts_user_updated", "user_id", "updated_at"),
    )
