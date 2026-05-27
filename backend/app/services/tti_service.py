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


async def _validate_answers(db: AsyncSession, answers: list[TtiAnswerIn]) -> None:
    if len(answers) != 12:
        raise HTTPException(status_code=422, detail=f"정확히 12개의 답변이 필요합니다. (현재 {len(answers)}개)")

    question_ids = [a.question_id for a in answers]
    if len(set(question_ids)) != len(question_ids):
        raise HTTPException(status_code=422, detail="같은 질문에 대한 답변이 중복되었습니다.")

    question_result = await db.execute(select(TtiQuestion))
    questions = {q.id: q for q in question_result.scalars().all()}
    missing = [question_id for question_id in question_ids if question_id not in questions]
    if missing:
        raise HTTPException(status_code=422, detail="존재하지 않는 TTI 질문 답변이 포함되어 있습니다.")

    for a in answers:
        if a.axis not in VALID_AXES:
            raise HTTPException(status_code=422, detail=f"잘못된 축입니다: {a.axis}")
        if not (-2 <= a.value <= 2):
            raise HTTPException(status_code=422, detail=f"답변 값은 -2~2 범위여야 합니다. (현재 {a.value})")
        question = questions[a.question_id]
        if question.axis != a.axis:
            raise HTTPException(status_code=422, detail="질문과 답변 축이 일치하지 않습니다.")

    for ax_info in AXES:
        count = sum(1 for a in answers if a.axis == ax_info["axis"])
        if count != 3:
            raise HTTPException(status_code=422, detail=f"축 {ax_info['axis']}에 정확히 3개의 답변이 필요합니다. (현재 {count}개)")


async def calculate_result(
    db: AsyncSession, user: User, answers: list[TtiAnswerIn]
) -> TtiResultOut:
    await _validate_answers(db, answers)

    axis_scores: list[AxisScoreOut] = []

    for ax in AXES:
        related = [a for a in answers if a.axis == ax["axis"]]
        total = sum(a.value for a in related)
        avg = round(total / len(related))
        axis_scores.append(
            AxisScoreOut(
                axis=ax["axis"],
                left_letter=ax["left_letter"],
                right_letter=ax["right_letter"],
                score=avg,
            )
        )

    code = "".join(
        _letter_for_score(s) for s in axis_scores
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


def _letter_for_score(score: AxisScoreOut) -> str:
    if score.score < 0:
        return score.left_letter
    if score.score > 0:
        return score.right_letter

    # 완전 중립은 특정 한쪽으로 강제하지 않고 축별 기본 균형 타입으로 보냅니다.
    # 4개 축 모두 0이면 WCFH가 되어 "계획/검증/휴식/숨은장소"의 저강도 기본 추천으로 설명됩니다.
    neutral_defaults = {
        "PW": score.right_letter,
        "NC": score.right_letter,
        "FA": score.left_letter,
        "HS": score.left_letter,
    }
    return neutral_defaults.get(score.axis, score.left_letter)
