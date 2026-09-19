from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.consent import ConsentSubmitIn
from ..services import consent_service

router = APIRouter()


@router.get("", response_model=dict)
async def get_consents(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The standing answer for every consent type, including the ones the user
    has never been asked, so the client can drive both first asks and
    re-consent prompts from one response."""
    status = await consent_service.status(db, user.id)
    return {"data": status.model_dump(by_alias=True), "error": None}


@router.post("", response_model=dict)
async def submit_consents(
    body: ConsentSubmitIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Append consent decisions made after signup: the matching gates, a
    re-consent after a document changed, or a marketing withdrawal."""
    consent_service.validate(body.consents, source=body.source)
    recorded = await consent_service.record(db, user.id, body.consents, body.source)
    status = await consent_service.status(db, user.id)
    return {
        "data": {
            "recorded": [item.model_dump(by_alias=True) for item in recorded],
            **status.model_dump(by_alias=True),
        },
        "error": None,
    }


@router.get("/history", response_model=dict)
async def get_consent_history(
    limit: int = Query(default=100, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The full ledger, newest first, so a user can see what they agreed to and
    when -- including consents they later withdrew."""
    items = await consent_service.history(db, user.id, limit)
    return {
        "data": {"items": [item.model_dump(by_alias=True) for item in items]},
        "error": None,
    }
