"""여행 후기 게시판.

화면(`/community/*`)이 브라우저 저장소로 돌리던 글·댓글·공감·저장·임시저장을
서버 계약으로 옮긴 것이다. 화면의 검증 규칙과 문구를 그대로 지켜, 어댑터만
바꿔 끼우면 같은 화면이 같은 결과를 보게 한다.
"""
import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ..models.communication import Block
from ..models.community import CommunityComment, CommunityDraft, CommunityPost, CommunityPostReaction
from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..schemas.community import (
    CommunityAuthorOut,
    CommunityCommentIn,
    CommunityCommentOut,
    CommunityDraftIn,
    CommunityDraftOut,
    CommunityPostIn,
    CommunityPostOut,
    CommunityPostPageOut,
    CommunityReactionOut,
)

VIEWS = ("all", "mine", "saved")
SORTS = ("latest", "popular")
PAGE_SIZE_DEFAULT = 10
PAGE_SIZE_MAX = 50
# 한 글에 붙는 댓글은 한 번에 내려준다. 대댓글·더 보기는 아직 화면에 없다.
COMMENT_LIMIT = 200
DRAFT_KEY_MAX = 80


def _now() -> datetime:
    return datetime.utcnow()


def _tags_text(tags: list[str]) -> str | None:
    """태그를 한 줄로 합친 검색용 사본."""
    return " ".join(tags) or None


def _blocked_filters(user_id: str):
    """차단한 사람과 나를 차단한 사람의 글을 모두 뺀다.

    한쪽만 걸러내면, 나를 차단한 사람의 글이 내 목록에 계속 남는다. 차단은
    서로 보이지 않기 위한 장치이므로 양방향으로 적용한다.
    """
    blocked_by_me = select(Block.blocked_user_id).where(
        Block.blocker_id == user_id,
        Block.released_at.is_(None),
        Block.deleted_at.is_(None),
    )
    blocking_me = select(Block.blocker_id).where(
        Block.blocked_user_id == user_id,
        Block.released_at.is_(None),
        Block.deleted_at.is_(None),
    )
    return blocked_by_me, blocking_me


def _like_count_column():
    return (
        select(func.count(CommunityPostReaction.user_id))
        .where(
            CommunityPostReaction.post_id == CommunityPost.id,
            CommunityPostReaction.liked_at.is_not(None),
        )
        .correlate(CommunityPost)
        .scalar_subquery()
    )


def _comment_count_column(blocked_by_me, blocking_me):
    """목록에 보이는 댓글 수.

    차단한 상대의 댓글은 상세에서 보이지 않으므로 여기서도 빼야 한다. 그러지
    않으면 목록은 "댓글 2"인데 열어 보면 하나만 있는 화면이 된다.
    """
    return (
        select(func.count(CommunityComment.id))
        .where(
            CommunityComment.post_id == CommunityPost.id,
            CommunityComment.deleted_at.is_(None),
            CommunityComment.author_id.not_in(blocked_by_me),
            CommunityComment.author_id.not_in(blocking_me),
        )
        .correlate(CommunityPost)
        .scalar_subquery()
    )


def _author_out(user: User) -> CommunityAuthorOut:
    return CommunityAuthorOut(id=user.id, nickname=user.nickname, avatar_url=user.avatar_url)


def _post_out(
    post: CommunityPost,
    author: User,
    *,
    viewer_id: str,
    like_count: int,
    comment_count: int,
    liked_at: datetime | None,
    saved_at: datetime | None,
    comments: list[CommunityCommentOut] | None = None,
) -> CommunityPostOut:
    return CommunityPostOut(
        id=post.id,
        author=_author_out(author),
        trip_id=post.trip_id,
        category=post.category,
        title=post.title,
        body=post.body,
        region=post.region,
        tags=list(post.tags_json or []),
        image=post.image,
        image_caption=post.image_caption,
        allow_comments=post.allow_comments,
        like_count=like_count,
        comment_count=comment_count,
        liked=liked_at is not None,
        saved=saved_at is not None,
        mine=post.author_id == viewer_id,
        created_at=post.created_at,
        updated_at=post.updated_at,
        comments=comments,
    )


def _comment_out(comment: CommunityComment, author: User, viewer_id: str) -> CommunityCommentOut:
    return CommunityCommentOut(
        id=comment.id,
        post_id=comment.post_id,
        author=_author_out(author),
        body=comment.body,
        created_at=comment.created_at,
        mine=comment.author_id == viewer_id,
    )


def _draft_out(draft: CommunityDraft) -> CommunityDraftOut:
    return CommunityDraftOut(
        draft_key=draft.draft_key,
        title=draft.title,
        body=draft.body,
        category=draft.category,
        region=draft.region,
        tags=list(draft.tags_json or []),
        image=draft.image,
        image_caption=draft.image_caption,
        allow_comments=draft.allow_comments,
        updated_at=draft.updated_at,
    )


async def _get_visible_post(db: AsyncSession, user: User, post_id: str) -> CommunityPost:
    """읽을 수 있는 글 하나. 삭제된 글과 차단 관계의 글은 없는 것으로 다룬다."""
    blocked_by_me, blocking_me = _blocked_filters(user.id)
    post = (
        await db.execute(
            select(CommunityPost).where(
                CommunityPost.id == post_id,
                CommunityPost.deleted_at.is_(None),
                CommunityPost.author_id.not_in(blocked_by_me),
                CommunityPost.author_id.not_in(blocking_me),
            )
        )
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="글을 찾을 수 없습니다.")
    return post


async def _get_own_post(db: AsyncSession, user: User, post_id: str) -> CommunityPost:
    """고치거나 지울 수 있는 글.

    남의 글에는 404가 아니라 403을 준다. 글이 있다는 사실은 목록에서 이미
    보이므로 숨길 것이 없고, 권한이 없다는 점이 화면에 그대로 필요하다.
    """
    post = await _get_visible_post(db, user, post_id)
    if post.author_id != user.id:
        raise HTTPException(status_code=403, detail="내가 작성한 글만 변경할 수 있습니다.")
    return post


async def _consume_draft(db: AsyncSession, user: User, draft_key: str | None) -> None:
    """작성 완료로 쓰인 초안을 같은 트랜잭션에서 지운다.

    화면은 글을 올린 뒤 그 초안을 없앤다. 삭제를 별도 요청으로 두면 글은
    올라갔는데 초안이 남는 중간 상태가 생기고, 다음 글쓰기에서 이미 게시한
    내용이 되살아난다.
    """
    if not draft_key:
        return
    draft = await db.get(CommunityDraft, {"user_id": user.id, "draft_key": draft_key.strip()})
    if draft:
        await db.delete(draft)


async def _resolve_trip_id(db: AsyncSession, user_id: str, trip_id: str | None) -> str | None:
    """후기에 붙는 여행은 글쓴이가 참여한 여행이어야 한다."""
    if not trip_id:
        return None
    found = (
        await db.execute(
            select(Trip.id)
            .join(Match, Match.id == Trip.match_id)
            .where(
                Trip.id == trip_id,
                or_(Match.user_id == user_id, Match.matched_user_id == user_id),
            )
        )
    ).scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")
    return found


async def list_posts(
    db: AsyncSession,
    user: User,
    *,
    category: str | None = None,
    query: str | None = None,
    view: str = "all",
    sort: str = "latest",
    page: int = 1,
    size: int = PAGE_SIZE_DEFAULT,
) -> CommunityPostPageOut:
    if view not in VIEWS:
        raise HTTPException(status_code=400, detail="지원하지 않는 보기입니다.")
    if sort not in SORTS:
        raise HTTPException(status_code=400, detail="지원하지 않는 정렬입니다.")

    page = max(1, page)
    size = max(1, min(size, PAGE_SIZE_MAX))
    blocked_by_me, blocking_me = _blocked_filters(user.id)
    author = aliased(User)
    reaction = aliased(CommunityPostReaction)

    conditions = [
        CommunityPost.deleted_at.is_(None),
        CommunityPost.author_id.not_in(blocked_by_me),
        CommunityPost.author_id.not_in(blocking_me),
    ]
    if category and category != "전체":
        conditions.append(CommunityPost.category == category)
    if view == "mine":
        conditions.append(CommunityPost.author_id == user.id)
    if view == "saved":
        conditions.append(reaction.saved_at.is_not(None))

    keyword = (query or "").strip()
    if keyword:
        pattern = f"%{keyword}%"
        conditions.append(
            or_(
                CommunityPost.title.ilike(pattern),
                CommunityPost.body.ilike(pattern),
                CommunityPost.region.ilike(pattern),
                CommunityPost.tags_text.ilike(pattern),
                author.nickname.ilike(pattern),
            )
        )

    like_count = _like_count_column()
    base = (
        select(CommunityPost, author, like_count.label("like_count"), _comment_count_column(blocked_by_me, blocking_me), reaction.liked_at, reaction.saved_at)
        .join(author, author.id == CommunityPost.author_id)
        .outerjoin(reaction, (reaction.post_id == CommunityPost.id) & (reaction.user_id == user.id))
        .where(*conditions)
    )

    total = int(
        (
            await db.execute(
                select(func.count())
                .select_from(CommunityPost)
                .join(author, author.id == CommunityPost.author_id)
                .outerjoin(reaction, (reaction.post_id == CommunityPost.id) & (reaction.user_id == user.id))
                .where(*conditions)
            )
        ).scalar_one()
    )

    if sort == "popular":
        # 공감 수가 같으면 최신 글을 앞에 둔다. 화면의 공감순과 같은 기준이다.
        base = base.order_by(like_count.desc(), CommunityPost.created_at.desc(), CommunityPost.id.desc())
    else:
        base = base.order_by(CommunityPost.created_at.desc(), CommunityPost.id.desc())

    rows = (await db.execute(base.offset((page - 1) * size).limit(size))).all()
    items = [
        _post_out(
            post,
            post_author,
            viewer_id=user.id,
            like_count=int(likes or 0),
            comment_count=int(comments or 0),
            liked_at=liked_at,
            saved_at=saved_at,
        )
        for post, post_author, likes, comments, liked_at, saved_at in rows
    ]
    return CommunityPostPageOut(
        items=items,
        page=page,
        size=size,
        total=total,
        total_pages=max(1, -(-total // size)),
    )


async def get_post(db: AsyncSession, user: User, post_id: str) -> CommunityPostOut:
    post = await _get_visible_post(db, user, post_id)
    author = await db.get(User, post.author_id)
    if not author:
        raise HTTPException(status_code=404, detail="글을 찾을 수 없습니다.")

    comments = await list_comments(db, user, post_id, post=post)
    likes = int(
        (
            await db.execute(
                select(func.count(CommunityPostReaction.user_id)).where(
                    CommunityPostReaction.post_id == post.id,
                    CommunityPostReaction.liked_at.is_not(None),
                )
            )
        ).scalar_one()
    )
    reaction = await db.get(CommunityPostReaction, {"post_id": post.id, "user_id": user.id})
    return _post_out(
        post,
        author,
        viewer_id=user.id,
        like_count=likes,
        comment_count=len(comments),
        liked_at=reaction.liked_at if reaction else None,
        saved_at=reaction.saved_at if reaction else None,
        comments=comments,
    )


async def create_post(
    db: AsyncSession, user: User, body: CommunityPostIn, *, draft_key: str | None = None
) -> CommunityPostOut:
    trip_id = await _resolve_trip_id(db, user.id, body.trip_id)
    now = _now()
    post = CommunityPost(
        id=str(uuid.uuid4()),
        author_id=user.id,
        trip_id=trip_id,
        category=body.category,
        title=body.title,
        body=body.body,
        region=body.region,
        tags_json=body.tags,
        tags_text=_tags_text(body.tags),
        image=body.image,
        image_caption=body.image_caption,
        allow_comments=body.allow_comments,
        created_at=now,
        updated_at=now,
    )
    db.add(post)
    await _consume_draft(db, user, draft_key)
    await db.commit()
    return await get_post(db, user, post.id)


async def update_post(
    db: AsyncSession,
    user: User,
    post_id: str,
    body: CommunityPostIn,
    *,
    draft_key: str | None = None,
) -> CommunityPostOut:
    """글 전체를 다시 쓴다.

    수정 화면은 편집기 내용을 통째로 보내므로 부분 수정 계약을 두지 않는다.
    공감·저장·댓글은 글의 내용이 아니라 남들이 남긴 반응이라 그대로 남는다.
    """
    post = await _get_own_post(db, user, post_id)
    # tripId를 보내지 않은 수정은 기존 여행 연결을 그대로 둔다. 수정 화면은
    # 편집기 항목만 보내고 어느 여행에서 시작했는지는 다시 고르지 않는다.
    if body.trip_id:
        post.trip_id = await _resolve_trip_id(db, user.id, body.trip_id)
    post.category = body.category
    post.title = body.title
    post.body = body.body
    post.region = body.region
    post.tags_json = body.tags
    post.tags_text = _tags_text(body.tags)
    post.image = body.image
    post.image_caption = body.image_caption
    post.allow_comments = body.allow_comments
    post.updated_at = _now()
    await _consume_draft(db, user, draft_key or post.id)
    await db.commit()
    return await get_post(db, user, post.id)


async def delete_post(db: AsyncSession, user: User, post_id: str) -> None:
    """글을 지운다.

    행을 지우지 않고 시각만 남기는 이유는 신고·운영 검토 때문이다. 지워진
    글에 대한 신고가 들어와도 운영자가 원문을 확인할 수 있어야 한다.
    """
    post = await _get_own_post(db, user, post_id)
    now = _now()
    post.deleted_at = now
    post.deleted_by = user.id
    # 글에 딸린 초안도 함께 정리한다. 원본이 없는 수정 초안은 이어 쓸 수 없다.
    draft = await db.get(CommunityDraft, {"user_id": user.id, "draft_key": post.id})
    if draft:
        await db.delete(draft)
    await db.commit()


async def set_reaction(
    db: AsyncSession, user: User, post_id: str, field: str, value: bool
) -> CommunityReactionOut:
    """공감 또는 저장 상태를 원하는 값으로 맞춘다."""
    if field not in ("liked", "saved"):
        raise HTTPException(status_code=400, detail="지원하지 않는 반응입니다.")
    post = await _get_visible_post(db, user, post_id)

    reaction = await db.get(CommunityPostReaction, {"post_id": post.id, "user_id": user.id})
    if reaction is None:
        reaction = CommunityPostReaction(post_id=post.id, user_id=user.id)
        db.add(reaction)
    setattr(reaction, f"{field}_at", _now() if value else None)
    try:
        await db.commit()
    except IntegrityError:
        # 같은 사용자의 요청이 겹쳐 다른 쪽이 먼저 행을 만든 경우다.
        # 원하는 상태는 이미 정해져 있으므로 그 행에 다시 적어 준다.
        await db.rollback()
        reaction = await db.get(CommunityPostReaction, {"post_id": post.id, "user_id": user.id})
        if reaction is None:
            raise
        setattr(reaction, f"{field}_at", _now() if value else None)
        await db.commit()

    likes = int(
        (
            await db.execute(
                select(func.count(CommunityPostReaction.user_id)).where(
                    CommunityPostReaction.post_id == post.id,
                    CommunityPostReaction.liked_at.is_not(None),
                )
            )
        ).scalar_one()
    )
    return CommunityReactionOut(
        post_id=post.id,
        like_count=likes,
        liked=reaction.liked_at is not None,
        saved=reaction.saved_at is not None,
    )


async def list_comments(
    db: AsyncSession, user: User, post_id: str, *, post: CommunityPost | None = None
) -> list[CommunityCommentOut]:
    if post is None:
        post = await _get_visible_post(db, user, post_id)
    blocked_by_me, blocking_me = _blocked_filters(user.id)
    author = aliased(User)
    rows = (
        await db.execute(
            select(CommunityComment, author)
            .join(author, author.id == CommunityComment.author_id)
            .where(
                CommunityComment.post_id == post.id,
                CommunityComment.deleted_at.is_(None),
                CommunityComment.author_id.not_in(blocked_by_me),
                CommunityComment.author_id.not_in(blocking_me),
            )
            .order_by(CommunityComment.created_at.asc(), CommunityComment.id.asc())
            .limit(COMMENT_LIMIT)
        )
    ).all()
    return [_comment_out(comment, comment_author, user.id) for comment, comment_author in rows]


async def create_comment(
    db: AsyncSession, user: User, post_id: str, body: CommunityCommentIn
) -> CommunityCommentOut:
    post = await _get_visible_post(db, user, post_id)
    if not post.allow_comments:
        raise HTTPException(status_code=403, detail="댓글을 받지 않는 글입니다.")
    comment = CommunityComment(
        id=str(uuid.uuid4()),
        post_id=post.id,
        author_id=user.id,
        body=body.body,
        created_at=_now(),
    )
    db.add(comment)
    await db.commit()
    return _comment_out(comment, user, user.id)


async def delete_comment(db: AsyncSession, user: User, post_id: str, comment_id: str) -> None:
    """댓글을 지운다. 지울 수 있는 사람은 그 댓글을 쓴 사람뿐이다.

    글쓴이에게 남의 댓글을 지울 권한을 주는 것은 게시판 운영 정책의 문제라
    신고·검토 계약과 함께 정한다. 화면도 지금은 내 댓글에만 삭제를 보여 준다.
    """
    post = await _get_visible_post(db, user, post_id)
    comment = (
        await db.execute(
            select(CommunityComment).where(
                CommunityComment.id == comment_id,
                CommunityComment.post_id == post.id,
                CommunityComment.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="내가 작성한 댓글만 삭제할 수 있습니다.")
    comment.deleted_at = _now()
    comment.deleted_by = user.id
    await db.commit()


def _validate_draft_key(draft_key: str) -> str:
    """화면이 쓰는 초안 키만 받는다.

    새 글은 "new", 수정 초안은 글 id, 여행에서 시작한 글은 "trip:<tripId>"다.
    """
    key = (draft_key or "").strip()
    if not key or len(key) > DRAFT_KEY_MAX:
        raise HTTPException(status_code=400, detail="임시저장 키가 올바르지 않습니다.")
    return key


async def list_drafts(db: AsyncSession, user: User) -> list[CommunityDraftOut]:
    rows = (
        await db.execute(
            select(CommunityDraft)
            .where(CommunityDraft.user_id == user.id)
            .order_by(CommunityDraft.updated_at.desc())
        )
    ).scalars().all()
    return [_draft_out(draft) for draft in rows]


async def save_draft(
    db: AsyncSession, user: User, draft_key: str, body: CommunityDraftIn
) -> CommunityDraftOut:
    key = _validate_draft_key(draft_key)
    # 글 id를 키로 쓰는 수정 초안은 그 글의 작성자만 만들 수 있다.
    if key != "new" and not key.startswith("trip:"):
        await _get_own_post(db, user, key)

    draft = await db.get(CommunityDraft, {"user_id": user.id, "draft_key": key})
    if draft is None:
        draft = CommunityDraft(user_id=user.id, draft_key=key, created_at=_now())
        db.add(draft)
    draft.category = body.category
    draft.title = body.title
    draft.body = body.body
    draft.region = body.region
    draft.tags_json = body.tags
    draft.image = body.image
    draft.image_caption = body.image_caption
    draft.allow_comments = body.allow_comments
    draft.updated_at = _now()
    await db.commit()
    return _draft_out(draft)


async def delete_draft(db: AsyncSession, user: User, draft_key: str) -> None:
    key = _validate_draft_key(draft_key)
    draft = await db.get(CommunityDraft, {"user_id": user.id, "draft_key": key})
    if not draft:
        raise HTTPException(status_code=404, detail="임시저장한 글을 찾을 수 없습니다.")
    await db.delete(draft)
    await db.commit()
