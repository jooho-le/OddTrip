from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.agent import AgentRunRequest
from ..services import travel_agent_service

router = APIRouter()


@router.post("/{trip_id}/agent/run", response_model=dict)
async def run_travel_agent(
    trip_id: str,
    body: AgentRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await travel_agent_service.run_agent(db, trip_id, body)
    return {"data": result.model_dump(by_alias=True), "error": None}
