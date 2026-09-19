from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_current_user_trip, get_db
from ..models.trip import Trip
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.coordination import ConcessionSubmissionIn, OddRuleProposalIn
from ..services import coordination_service

router = APIRouter()


async def _publish(db: AsyncSession, trip: Trip, event: str, data: dict) -> None:
    from ..models.match import Match

    match = await db.get(Match, trip.match_id)
    if match:
        await chat_connection_manager.send_to_users(
            {match.user_id, match.matched_user_id},
            {"event": event, "data": {"tripId": trip.id, **data}},
        )


@router.get("/{trip_id}/concessions", response_model=dict)
async def get_concessions(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.get_concessions(db, trip, user.id)
    return {"data": data, "error": None}


@router.put("/{trip_id}/concessions/me", response_model=dict)
async def save_concessions(
    trip_id: str,
    body: ConcessionSubmissionIn,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.save_concessions(db, trip, user.id, body)
    await _publish(
        db,
        trip,
        "concession.updated",
        {"userId": user.id, "submitted": data["mineSubmitted"], "revealed": bool(data["revealedAt"])},
    )
    return {"data": data, "error": None}


@router.get("/{trip_id}/odd-rules", response_model=dict)
async def get_odd_rules(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.get_odd_rules(db, trip, user.id)
    return {"data": data, "error": None}


@router.post("/{trip_id}/odd-rules/proposals", response_model=dict, status_code=201)
async def propose_odd_rule(
    trip_id: str,
    body: OddRuleProposalIn,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.propose_odd_rule(db, trip, user.id, body)
    await _publish(db, trip, "odd_rule.proposed", {"proposedBy": user.id})
    return {"data": data, "error": None}


@router.post("/{trip_id}/odd-rules/proposals/{proposal_id}/accept", response_model=dict)
async def accept_odd_rule(
    trip_id: str,
    proposal_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.respond_odd_rule(
        db, trip, proposal_id, user.id, accept=True
    )
    await _publish(
        db,
        trip,
        "odd_rule.responded",
        {"proposalId": proposal_id, "status": "accepted", "respondedBy": user.id},
    )
    return {"data": data, "error": None}


@router.post("/{trip_id}/odd-rules/proposals/{proposal_id}/reject", response_model=dict)
async def reject_odd_rule(
    trip_id: str,
    proposal_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await coordination_service.respond_odd_rule(
        db, trip, proposal_id, user.id, accept=False
    )
    await _publish(
        db,
        trip,
        "odd_rule.responded",
        {"proposalId": proposal_id, "status": "rejected", "respondedBy": user.id},
    )
    return {"data": data, "error": None}
