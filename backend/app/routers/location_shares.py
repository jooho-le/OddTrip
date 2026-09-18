from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.location_share import (
    DURATION_CHOICES,
    LocationPing,
    LocationShareCreate,
    LocationShareExtend,
)
from ..services import location_share_service

# 내 공유를 다루는 자리. 로그인이 필요하다.
router = APIRouter()
# 링크를 받은 사람이 여는 자리. 로그인하지 않는다.
public_router = APIRouter()


@router.get("", response_model=dict)
async def get_active_share(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """지금 켜져 있는 공유. 없으면 null."""
    share = await location_share_service.get_active_out(db, user)
    return {
        "data": {
            "share": share.model_dump(by_alias=True) if share else None,
            "durationChoices": list(DURATION_CHOICES),
        },
        "error": None,
    }


@router.post("", response_model=dict, status_code=201)
async def start_share(
    body: LocationShareCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    share = await location_share_service.start(db, user, body)
    return {"data": share.model_dump(by_alias=True), "error": None}


@router.post("/{share_id}/extend", response_model=dict)
async def extend_share(
    share_id: str,
    body: LocationShareExtend,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    share = await location_share_service.extend(db, user, share_id, body)
    return {"data": share.model_dump(by_alias=True), "error": None}


@router.post("/{share_id}/ping", response_model=dict)
async def ping_share(
    share_id: str,
    body: LocationPing,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """현재 좌표를 올린다. 화면이 몇십 초마다 부른다."""
    share = await location_share_service.ping(db, user, share_id, body)
    return {"data": share.model_dump(by_alias=True), "error": None}


@router.delete("/{share_id}", response_model=dict)
async def stop_share(
    share_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await location_share_service.stop(db, user, share_id)
    return {"data": {"id": share_id, "stopped": True}, "error": None}


@public_router.get("/{token}", response_model=dict)
async def view_share(
    token: str = Path(min_length=8, max_length=64),
    db: AsyncSession = Depends(get_db),
):
    """링크를 받은 사람이 보는 위치. 인증 없이 열리는 유일한 자리다."""
    view = await location_share_service.view(db, token)
    return {"data": view.model_dump(by_alias=True), "error": None}
