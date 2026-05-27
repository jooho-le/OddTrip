from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from ..models.match import Match
from ..models.trip import Trip
from ..models.user import User
from ..schemas.decision import JointPreferenceOut
from . import openai_service

DEFAULT_PREFERENCES = {
    "places": [],
    "activities": [],
    "foods": [],
    "pace": 50,
    "budget": 50,
    "indoorPreferred": False,
    "hiddenSpots": False,
}


async def get_preferences(db: AsyncSession, trip_id: str) -> JointPreferenceOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    prefs = trip.preferences_json or DEFAULT_PREFERENCES
    return JointPreferenceOut(
        places=prefs.get("places", []),
        activities=prefs.get("activities", []),
        foods=prefs.get("foods", []),
        pace=prefs.get("pace", 50),
        budget=prefs.get("budget", 50),
        indoor_preferred=prefs.get("indoorPreferred", False),
        hidden_spots=prefs.get("hiddenSpots", False),
    )


async def update_preferences(
    db: AsyncSession, trip_id: str, prefs: dict
) -> JointPreferenceOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    trip.preferences_json = _normalize_preferences(prefs)
    await db.commit()
    prefs = trip.preferences_json
    return JointPreferenceOut(
        places=prefs.get("places", []),
        activities=prefs.get("activities", []),
        foods=prefs.get("foods", []),
        pace=prefs.get("pace", 50),
        budget=prefs.get("budget", 50),
        indoor_preferred=prefs.get("indoorPreferred", False),
        hidden_spots=prefs.get("hiddenSpots", False),
    )


async def resolve_conflict(
    db: AsyncSession, trip_id: str, conflicts: list[str]
) -> str:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)

    prefs = trip.preferences_json or {}
    resolved_conflicts = conflicts or _infer_conflicts(prefs)

    return await openai_service.resolve_conflict(
        user_a_code=user_a.tti_code if user_a else "",
        user_b_code=user_b.tti_code if user_b else "",
        preferences=prefs,
        conflicts=resolved_conflicts,
    )


def _normalize_preferences(prefs: dict) -> dict:
    normalized = {
        "places": _dedupe_strings(prefs.get("places", [])),
        "activities": _dedupe_strings(prefs.get("activities", [])),
        "foods": _dedupe_strings(prefs.get("foods", [])),
        "pace": _clamp_int(prefs.get("pace", 50), 0, 100),
        "budget": _clamp_int(prefs.get("budget", 50), 0, 100),
        "indoorPreferred": bool(prefs.get("indoorPreferred", False)),
        "hiddenSpots": bool(prefs.get("hiddenSpots", False)),
    }
    normalized["priorityHints"] = _priority_hints(normalized)
    return normalized


def _dedupe_strings(values: object) -> list[str]:
    if not isinstance(values, list):
        return []
    seen = set()
    result = []
    for value in values:
        text = str(value).strip()
        if text and text not in seen:
            seen.add(text)
            result.append(text)
    return result[:12]


def _clamp_int(value: object, low: int, high: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = 50
    return max(low, min(high, parsed))


def _priority_hints(prefs: dict) -> list[str]:
    hints = []
    if prefs["pace"] >= 70:
        hints.append("활동 밀도 우선")
    elif prefs["pace"] <= 35:
        hints.append("휴식 시간 우선")
    if prefs["budget"] <= 35:
        hints.append("예산 절약 우선")
    elif prefs["budget"] >= 70:
        hints.append("경험 가치 우선")
    if prefs["indoorPreferred"]:
        hints.append("날씨 대응 우선")
    if prefs["hiddenSpots"]:
        hints.append("숨은 명소 우선")
    return hints


def _infer_conflicts(prefs: dict) -> list[str]:
    conflicts = []
    if prefs.get("pace", 50) >= 70 and prefs.get("indoorPreferred"):
        conflicts.append("활동적인 일정과 실내 선호가 동시에 강함")
    if prefs.get("hiddenSpots") and len(prefs.get("places", [])) >= 4:
        conflicts.append("숨은 명소 선호와 많은 방문지 수 사이의 이동 부담")
    if prefs.get("budget", 50) <= 35 and len(prefs.get("activities", [])) >= 3:
        conflicts.append("예산 절약과 체험 활동 수 사이의 균형")
    if not conflicts:
        conflicts.append("두 여행자의 속도와 장소 선호를 균형 있게 배치")
    return conflicts
