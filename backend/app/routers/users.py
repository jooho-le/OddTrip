from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter()


@router.post("", response_model=dict)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    if not settings.allow_demo_user_header_auth:
        raise HTTPException(status_code=410, detail="사용자 생성은 /api/auth/register를 사용해주세요.")

    user = User(
        nickname=body.nickname,
        avatar_url=body.avatar_url,
        home_region=body.home_region,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"data": UserOut.model_validate(user).model_dump(by_alias=True), "error": None}


@router.get("/me", response_model=dict)
async def get_me(user: User = Depends(get_current_user)):
    return {"data": UserOut.model_validate(user).model_dump(by_alias=True), "error": None}


@router.patch("/me", response_model=dict)
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.nickname is not None:
        user.nickname = body.nickname
    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url
    if body.home_region is not None:
        user.home_region = body.home_region
    await db.commit()
    await db.refresh(user)
    return {"data": UserOut.model_validate(user).model_dump(by_alias=True), "error": None}
