from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.notification import NotificationReadIn
from ..services import notification_service

router = APIRouter()


@router.get("", response_model=dict)
async def list_notifications(
    unread_only: bool = Query(default=False, alias="unreadOnly"),
    before: datetime | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, next_before = await notification_service.list_notifications(
        db, user.id, unread_only=unread_only, before=before, limit=limit
    )
    return {
        "data": {
            "items": [item.model_dump(by_alias=True) for item in items],
            "nextBefore": next_before,
        },
        "error": None,
    }


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count = await notification_service.get_unread_count(db, user.id)
    return {"data": {"count": count}, "error": None}


@router.put("/read", response_model=dict)
async def mark_read(
    body: NotificationReadIn | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ids = body.notification_ids if body else None
    updated, unread = await notification_service.mark_read(db, user.id, ids)
    return {"data": {"updated": updated, "unreadCount": unread}, "error": None}
