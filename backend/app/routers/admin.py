"""운영자 전용 API.

모든 엔드포인트가 ``get_current_admin``을 거친다. 별도 라우터로 분리한 이유는
가드를 한 곳에서만 걸기 위해서다. 사용자용 라우터에 관리자 경로를 섞으면
가드를 빠뜨린 엔드포인트가 눈에 띄지 않는다.

여행은 조회만 제공한다. 관리자가 남의 여행을 고치거나 지우는 것은 사유·당사자
통보·기록을 먼저 정해야 하는 별도 사안이다.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_admin, get_db
from ..models.user import User
from ..services import admin_service

router = APIRouter()


@router.get("/stats", response_model=dict)
async def get_stats(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.stats(db)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/users", response_model=dict)
async def list_users(
    q: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, pattern="^(active|withdrawn)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items, total = await admin_service.list_users(
        db, query=q, status=status, limit=limit, offset=offset
    )
    return {
        "data": {"items": [item.model_dump(by_alias=True) for item in items], "total": total},
        "error": None,
    }


@router.get("/users/{user_id}", response_model=dict)
async def get_user(
    user_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.get_user(db, user_id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.get("/trips", response_model=dict)
async def list_trips(
    q: str | None = Query(default=None, max_length=100),
    status: str | None = Query(default=None, pattern="^(planning|confirmed|completed|cancelled)$"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items, total = await admin_service.list_trips(
        db, query=q, status=status, limit=limit, offset=offset
    )
    return {
        "data": {"items": [item.model_dump(by_alias=True) for item in items], "total": total},
        "error": None,
    }


@router.get("/trips/{trip_id}", response_model=dict)
async def get_trip(
    trip_id: str,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await admin_service.get_trip(db, trip_id)
    return {"data": data.model_dump(by_alias=True), "error": None}
