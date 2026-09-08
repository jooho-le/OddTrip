from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.match import Match
from ..models.user import User
from ..services import match_service

router = APIRouter()


@router.get("", response_model=dict)
async def get_matches(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    candidates = await match_service.find_matches(db, user)
    return {"data": [c.model_dump(by_alias=True) for c in candidates], "error": None}


@router.get("/{match_id}", response_model=dict)
async def get_match_detail(
    match_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    match = await match_service.get_match_by_id(db, match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if user.id not in {match.user_id, match.matched_user_id}:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"data": {"id": match.id, "matchLevel": match.match_level, "recommendationScore": match.recommendation_score}, "error": None}


@router.post(
    "/{matched_user_id}/accept",
    response_model=dict,
    deprecated=True,
    description="이전 프론트 호환용입니다. 신규 흐름은 POST /api/match-requests 후 요청 수락 API를 사용합니다.",
)
async def accept_match(
    matched_user_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raise HTTPException(
        status_code=410,
        detail="즉시 매칭 API는 종료되었습니다. 매칭 요청을 보내고 상대방의 수락을 받아주세요.",
    )
