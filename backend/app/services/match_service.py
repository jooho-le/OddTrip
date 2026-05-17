from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.match import Match
from ..models.tti import TravelType
from ..models.user import User
from ..schemas.match import MatchCandidateOut
from .tti_service import AXES, OPPOSITE_MAP

AXIS_LABELS = {
    "PW": "계획 밀도",
    "NC": "경험 선호",
    "FA": "활동 강도",
    "HS": "명소 선호",
}

COMPLEMENT_TEMPLATES = {
    "PW": ["놓칠 수 있는 예약을 챙겨줌", "즉흥 동선을 현실적인 일정으로 정리"],
    "NC": ["새로운 시도의 리스크를 낮춤", "검증된 선택에 신선함을 더함"],
    "FA": ["느슨한 일정에 활력을 더함", "쉬는 시간을 확보해줌"],
    "HS": ["유명 명소 놓치지 않게 챙김", "숨은 장소를 발견해줌"],
}


def _get_opposite_code(code: str) -> str:
    return "".join(OPPOSITE_MAP[ch] for ch in code)


def _count_opposite_axes(code_a: str, code_b: str) -> tuple[int, list[str]]:
    opposite = _get_opposite_code(code_a)
    count = 0
    diff_axes = []
    for i, ax in enumerate(AXES):
        if code_b[i] == opposite[i]:
            count += 1
            diff_axes.append(ax["axis"])
    return count, diff_axes


def _calc_score(count: int, user_scores: list[dict], candidate_scores: list[dict] | None) -> int:
    base = {4: 90, 3: 80, 2: 70}.get(count, 60)
    if not candidate_scores:
        return base

    distance_bonus = 0
    for us in user_scores:
        cs = next((c for c in candidate_scores if c["axis"] == us["axis"]), None)
        if cs:
            distance_bonus += abs(us["score"] - cs["score"])
    normalized = min(distance_bonus, 10)
    return base + normalized


async def find_matches(
    db: AsyncSession, user: User
) -> list[MatchCandidateOut]:
    if not user.tti_code:
        return []

    result = await db.execute(
        select(User).where(User.id != user.id, User.tti_code.isnot(None))
    )
    candidates = list(result.scalars().all())

    matches_out: list[MatchCandidateOut] = []
    user_scores = user.tti_scores_json or []

    for candidate in candidates:
        count, diff_axes = _count_opposite_axes(user.tti_code, candidate.tti_code)
        if count < 2:
            continue

        match_level = {4: "완전 반대", 3: "부분 반대"}.get(count, "추천")
        score = _calc_score(count, user_scores, candidate.tti_scores_json)

        differences = [AXIS_LABELS[ax] for ax in diff_axes]
        complements = []
        for ax in diff_axes:
            complements.extend(COMPLEMENT_TEMPLATES.get(ax, []))

        # Get travel type for summary
        type_result = await db.execute(
            select(TravelType).where(TravelType.code == candidate.tti_code)
        )
        travel_type = type_result.scalar_one_or_none()
        summary = travel_type.description if travel_type else ""

        compatibility = f"당신의 여행 스타일과 {candidate.nickname}님의 스타일이 상호보완적입니다."

        matches_out.append(
            MatchCandidateOut(
                id=candidate.id,
                nickname=candidate.nickname,
                age_range="",
                region=candidate.home_region or "",
                avatar_url=candidate.avatar_url,
                tti_code=candidate.tti_code,
                summary=summary,
                compatibility=compatibility,
                match_level=match_level,
                recommendation_score=min(score, 100),
                differences=differences,
                complements=complements[:4],
            )
        )

    matches_out.sort(key=lambda m: m.recommendation_score, reverse=True)
    return matches_out


async def get_match_by_id(db: AsyncSession, match_id: str) -> Match | None:
    result = await db.execute(select(Match).where(Match.id == match_id))
    return result.scalar_one_or_none()
