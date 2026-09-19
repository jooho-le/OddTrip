from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_current_user_trip, get_db
from ..models.trip import Trip
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.approval import ApprovalActionIn
from ..services import approval_service, notification_service

router = APIRouter()


@router.get("/{trip_id}/approval", response_model=dict)
async def get_approval(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await approval_service.get_state(db, trip, user.id)
    return {"data": data.model_dump(by_alias=True), "error": None}


@router.put("/{trip_id}/approval/me", response_model=dict)
async def respond_to_approval(
    trip_id: str,
    body: ApprovalActionIn,
    _: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data, notifications, match = await approval_service.respond(db, trip_id, user.id, body)
    await notification_service.push(notifications)
    await chat_connection_manager.send_to_users(
        {match.user_id, match.matched_user_id},
        {
            "event": "itinerary.approval_updated",
            "data": {
                "tripId": data.trip_id,
                "itineraryRevision": data.itinerary_revision,
                "tripStatus": data.trip_status,
            },
        },
    )
    return {"data": data.model_dump(by_alias=True), "error": None}
