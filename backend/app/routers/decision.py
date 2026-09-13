from fastapi import APIRouter, Depends, HTTPException
from openai import RateLimitError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_current_user_trip, get_db
from ..models.trip import Trip
from ..models.match import Match
from ..models.user import User
from ..realtime import chat_connection_manager
from ..schemas.decision import ConflictRequest, JointPreferenceIn, PersonalPreferenceIn, PreferenceProposalIn
from ..services import decision_service

router = APIRouter()


async def _publish_coordination_event(
    db: AsyncSession, trip: Trip, event: str, data: dict
) -> None:
    match = await db.get(Match, trip.match_id)
    if not match:
        return
    await chat_connection_manager.send_to_users(
        {match.user_id, match.matched_user_id},
        {"event": event, "data": {"tripId": trip.id, **data}},
    )


@router.get("/{trip_id}/preferences/proposals", response_model=dict)
async def list_preference_proposals(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.list_preference_proposals(db, trip, user.id)
    return {"data": data, "error": None}


@router.post("/{trip_id}/preferences/proposals", response_model=dict, status_code=201)
async def create_preference_proposal(
    trip_id: str,
    body: PreferenceProposalIn,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.create_preference_proposal(
        db, trip, user.id, body.preferences.model_dump(by_alias=True, mode="json")
    )
    await _publish_coordination_event(
        db, trip, "preference.proposal_created", {"proposalId": data["id"], "proposedBy": user.id}
    )
    return {"data": data, "error": None}


@router.post("/{trip_id}/preferences/proposals/{proposal_id}/accept", response_model=dict)
async def accept_preference_proposal(
    trip_id: str,
    proposal_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.respond_to_preference_proposal(
        db, trip, proposal_id, user.id, accept=True
    )
    await _publish_coordination_event(
        db, trip, "preference.proposal_responded", {"proposalId": proposal_id, "status": "accepted", "respondedBy": user.id}
    )
    return {"data": data, "error": None}


@router.post("/{trip_id}/preferences/proposals/{proposal_id}/reject", response_model=dict)
async def reject_preference_proposal(
    trip_id: str,
    proposal_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.respond_to_preference_proposal(
        db, trip, proposal_id, user.id, accept=False
    )
    await _publish_coordination_event(
        db, trip, "preference.proposal_responded", {"proposalId": proposal_id, "status": "rejected", "respondedBy": user.id}
    )
    return {"data": data, "error": None}


@router.get("/{trip_id}/preferences/pair", response_model=dict)
async def get_pair_preferences(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.get_pair_preferences(db, trip, user.id)
    return {"data": data, "error": None}


@router.put("/{trip_id}/preferences/me", response_model=dict)
async def update_my_preferences(
    trip_id: str,
    body: PersonalPreferenceIn,
    trip: Trip = Depends(get_current_user_trip),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await decision_service.update_personal_preferences(
        db, trip, user.id, body.model_dump(by_alias=True)
    )
    await _publish_coordination_event(
        db, trip, "preference.updated", {"userId": user.id}
    )
    return {"data": data, "error": None}


@router.get("/{trip_id}/preferences", response_model=dict)
async def get_preferences(
    trip_id: str,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    prefs = await decision_service.get_preferences(db, trip.id)
    return {"data": prefs.model_dump(by_alias=True), "error": None}


@router.put("/{trip_id}/preferences", response_model=dict)
async def update_preferences(
    trip_id: str,
    body: JointPreferenceIn,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    prefs = await decision_service.update_preferences(
        db, trip.id, body.model_dump(by_alias=True)
    )
    return {"data": prefs.model_dump(by_alias=True), "error": None}


@router.post("/{trip_id}/resolve-conflict", response_model=dict)
async def resolve_conflict(
    trip_id: str,
    body: ConflictRequest,
    trip: Trip = Depends(get_current_user_trip),
    db: AsyncSession = Depends(get_db),
):
    try:
        suggestion = await decision_service.resolve_conflict(db, trip.id, body.conflicts)
        return {"data": {"suggestion": suggestion}, "error": None}
    except RateLimitError:
        raise HTTPException(status_code=429, detail="AI 서비스가 바쁩니다. 잠시 후 다시 시도해주세요.")
