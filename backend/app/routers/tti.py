from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, get_db
from ..models.user import User
from ..schemas.tti import TtiCalculateRequest, TtiQuestionOut, TtiResultOut, TravelTypeOut
from ..services import tti_service

router = APIRouter()


@router.get("/questions", response_model=dict)
async def get_questions(db: AsyncSession = Depends(get_db)):
    questions = await tti_service.get_questions(db)
    data = [TtiQuestionOut.model_validate(q).model_dump(by_alias=True) for q in questions]
    return {"data": data, "error": None}


@router.post("/calculate", response_model=dict)
async def calculate(
    body: TtiCalculateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await tti_service.calculate_result(db, user, body.answers)
    return {"data": result.model_dump(by_alias=True), "error": None}


@router.get("/types", response_model=dict)
async def get_types(db: AsyncSession = Depends(get_db)):
    types = await tti_service.get_travel_types(db)
    data = []
    for t in types:
        data.append(TravelTypeOut(
            code=t.code,
            title=t.title,
            description=t.description,
            keywords=t.keywords_json or [],
        ).model_dump(by_alias=True))
    return {"data": data, "error": None}
