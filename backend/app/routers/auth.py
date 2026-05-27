import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.auth import AuthLoginIn, AuthOut, AuthRegisterIn
from ..schemas.user import UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=dict)
async def register(body: AuthRegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다.")

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
        avatar_url=body.avatar_url,
        home_region=body.home_region,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    data = AuthOut(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.post("/login", response_model=dict)
async def login(body: AuthLoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    data = AuthOut(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/me", response_model=dict)
async def me(user: User = Depends(get_current_user)):
    return {"data": UserOut.model_validate(user).model_dump(by_alias=True), "error": None}
