from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.community import (
    CommunityCommentIn,
    CommunityDraftIn,
    CommunityPostIn,
    CommunityReactionIn,
)
from ..services import community_service

router = APIRouter()


@router.get("/posts", response_model=dict)
async def list_posts(
    category: str | None = None,
    q: str | None = None,
    view: str = Query(default="all"),
    sort: str = Query(default="latest"),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=community_service.PAGE_SIZE_DEFAULT, ge=1, le=community_service.PAGE_SIZE_MAX),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """여행 후기 목록.

    화면의 카테고리 탭, 검색, 최신순·공감순, 전체·저장한 글·내 글 보기가
    그대로 질의 조건이 된다.
    """
    result = await community_service.list_posts(
        db, user, category=category, query=q, view=view, sort=sort, page=page, size=size
    )
    return {"data": result.model_dump(by_alias=True), "error": None}


@router.post("/posts", response_model=dict, status_code=201)
async def create_post(
    body: CommunityPostIn,
    draft_key: str | None = Query(default=None, alias="draftKey"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """후기 작성. draftKey를 함께 보내면 그 임시저장은 같은 요청에서 정리된다."""
    post = await community_service.create_post(db, user, body, draft_key=draft_key)
    return {"data": post.model_dump(by_alias=True), "error": None}


@router.get("/posts/{post_id}", response_model=dict)
async def get_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await community_service.get_post(db, user, post_id)
    return {"data": post.model_dump(by_alias=True), "error": None}


@router.put("/posts/{post_id}", response_model=dict)
async def update_post(
    post_id: str,
    body: CommunityPostIn,
    draft_key: str | None = Query(default=None, alias="draftKey"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await community_service.update_post(db, user, post_id, body, draft_key=draft_key)
    return {"data": post.model_dump(by_alias=True), "error": None}


@router.delete("/posts/{post_id}", response_model=dict)
async def delete_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await community_service.delete_post(db, user, post_id)
    return {"data": {"id": post_id, "deleted": True}, "error": None}


@router.put("/posts/{post_id}/like", response_model=dict)
async def set_like(
    post_id: str,
    body: CommunityReactionIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reaction = await community_service.set_reaction(db, user, post_id, "liked", body.value)
    return {"data": reaction.model_dump(by_alias=True), "error": None}


@router.put("/posts/{post_id}/save", response_model=dict)
async def set_save(
    post_id: str,
    body: CommunityReactionIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reaction = await community_service.set_reaction(db, user, post_id, "saved", body.value)
    return {"data": reaction.model_dump(by_alias=True), "error": None}


@router.get("/posts/{post_id}/comments", response_model=dict)
async def list_comments(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comments = await community_service.list_comments(db, user, post_id)
    return {
        "data": {"items": [comment.model_dump(by_alias=True) for comment in comments]},
        "error": None,
    }


@router.post("/posts/{post_id}/comments", response_model=dict, status_code=201)
async def create_comment(
    post_id: str,
    body: CommunityCommentIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await community_service.create_comment(db, user, post_id, body)
    return {"data": comment.model_dump(by_alias=True), "error": None}


@router.delete("/posts/{post_id}/comments/{comment_id}", response_model=dict)
async def delete_comment(
    post_id: str,
    comment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await community_service.delete_comment(db, user, post_id, comment_id)
    return {"data": {"id": comment_id, "deleted": True}, "error": None}


@router.get("/drafts", response_model=dict)
async def list_drafts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    drafts = await community_service.list_drafts(db, user)
    return {
        "data": {"items": [draft.model_dump(by_alias=True) for draft in drafts]},
        "error": None,
    }


@router.put("/drafts/{draft_key}", response_model=dict)
async def save_draft(
    body: CommunityDraftIn,
    # 새 글은 "new", 수정 초안은 글 id, 여행에서 시작한 글은 "trip:<tripId>"다.
    draft_key: str = Path(max_length=community_service.DRAFT_KEY_MAX),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    draft = await community_service.save_draft(db, user, draft_key, body)
    return {"data": draft.model_dump(by_alias=True), "error": None}


@router.delete("/drafts/{draft_key}", response_model=dict)
async def delete_draft(
    draft_key: str = Path(max_length=community_service.DRAFT_KEY_MAX),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await community_service.delete_draft(db, user, draft_key)
    return {"data": {"draftKey": draft_key, "deleted": True}, "error": None}
