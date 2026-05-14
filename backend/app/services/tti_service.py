from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.tti import TravelType, TtiQuestion
from ..models.user import User
from ..schemas.tti import AxisScoreOut, TtiAnswerIn, TtiResultOut

OPPOSITE_MAP = {"P": "W", "W": "P", "N": "C", "C": "N", "F": "A", "A": "F", "H": "S", "S": "H"}

VALID_AXES = {"PW", "NC", "FA", "HS"}

AXES = [
    {"axis": "PW", "left_letter": "P", "right_letter": "W"},
    {"axis": "NC", "left_letter": "N", "right_letter": "C"},
    {"axis": "FA", "left_letter": "F", "right_letter": "A"},
    {"axis": "HS", "left_letter": "H", "right_letter": "S"},
]


async def get_questions(db: AsyncSession) -> list[TtiQuestion]:
    result = await db.execute(select(TtiQuestion).order_by(TtiQuestion.sort_order))
    return list(result.scalars().all())


def _validate_answers(answers: list[TtiAnswerIn]) -> None:
    if len(answers) != 12:
        raise HTTPException(status_code=422, detail=f"정확히 12개의 답변이 필요합니다. (현재 {len(answers)}개)")

    for a in answers:
        if a.axis not in VALID_AXES:
            raise HTTPException(status_code=422, detail=f"잘못된 축입니다: {a.axis}")
        if not (-2 <= a.value <= 2):
            raise HTTPException(status_code=422, detail=f"답변 값은 -2~2 범위여야 합니다. (현재 {a.value})")

    for ax_info in AXES:
        count = sum(1 for a in answers if a.axis == ax_info["axis"])
        if count != 3:
            raise HTTPException(status_code=422, detail=f"축 {ax_info['axis']}에 정확히 3개의 답변이 필요합니다. (현재 {count}개)")


async def calculate_result(
    db: AsyncSession, user: User, answers: list[TtiAnswerIn]
) -> TtiResultOut:
    _validate_answers(answers)

    axis_scores: list[AxisScoreOut] = []

    for ax in AXES:
        related = [a for a in answers if a.axis == ax["axis"]]
        avg = round(sum(a.value for a in related) / len(related))
        axis_scores.append(
            AxisScoreOut(
                axis=ax["axis"],
                left_letter=ax["left_letter"],
                right_letter=ax["right_letter"],
                score=avg,
            )
        )

    code = "".join(
        s.left_letter if s.score <= 0 else s.right_letter for s in axis_scores
    )
    opposite_code = "".join(OPPOSITE_MAP[ch] for ch in code)

    result = await db.execute(select(TravelType).where(TravelType.code == code))
    travel_type = result.scalar_one_or_none()

    title = travel_type.title if travel_type else code
    description = travel_type.description if travel_type else ""

    # Save to user
    user.tti_code = code
    user.tti_scores_json = [s.model_dump() for s in axis_scores]
    await db.commit()

    return TtiResultOut(
        code=code,
        opposite_code=opposite_code,
        title=title,
        description=description,
        strengths=[
            "상대의 강점을 여행 운영에 반영하기 좋음",
            "일정 중간 조율 지점이 명확함",
            "AI 추천 이유를 이해하고 선택하기 쉬움",
        ],
        axis_scores=axis_scores,
    )


async def get_travel_types(db: AsyncSession) -> list[TravelType]:
    result = await db.execute(select(TravelType))
    return list(result.scalars().all())
