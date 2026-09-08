from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from ..models.match import Match
from ..models.trip import Trip, TripUserPreference
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
    return _to_out(trip)


async def update_preferences(
    db: AsyncSession, trip_id: str, prefs: dict
) -> JointPreferenceOut:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    trip.preferences_json = _normalize_preferences(prefs)

    # Schedule and location are columns, not preference keys: the planner and
    # the safety lookups need to query and validate them.
    for field, column in (("title", "title"), ("region", "region")):
        value = prefs.get(field)
        if value is not None:
            setattr(trip, column, str(value).strip() or None)
    for field, column in (("dateFrom", "start_date"), ("dateTo", "end_date")):
        value = prefs.get(field)
        if value is not None:
            setattr(trip, column, value)

    await db.commit()
    return _to_out(trip)


async def update_personal_preferences(
    db: AsyncSession, trip: Trip, user_id: str, prefs: dict
) -> dict:
    _member_ids(await _get_match(db, trip), user_id)
    result = await db.execute(
        select(TripUserPreference).where(
            TripUserPreference.trip_id == trip.id,
            TripUserPreference.user_id == user_id,
        )
    )
    row = result.scalar_one_or_none()
    normalized = _normalize_preferences(prefs)
    if row:
        row.preferences_json = normalized
    else:
        row = TripUserPreference(trip_id=trip.id, user_id=user_id, preferences_json=normalized)
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return _personal_out(row)


async def get_pair_preferences(db: AsyncSession, trip: Trip, user_id: str) -> dict:
    match = await _get_match(db, trip)
    member_ids = _member_ids(match, user_id)
    rows = (await db.execute(
        select(TripUserPreference).where(
            TripUserPreference.trip_id == trip.id,
            TripUserPreference.user_id.in_(member_ids),
        )
    )).scalars().all()
    by_user = {row.user_id: row for row in rows}
    counterpart_id = member_ids[1]
    mine = by_user.get(user_id)
    counterpart = by_user.get(counterpart_id)
    return {
        "tripId": trip.id,
        "mine": _personal_out(mine) if mine else None,
        "counterpart": _personal_out(counterpart) if counterpart else None,
        "bothSubmitted": mine is not None and counterpart is not None,
        "comparison": _compare_preferences(
            mine.preferences_json if mine else None,
            counterpart.preferences_json if counterpart else None,
        ),
        "agreed": _to_out(trip).model_dump(by_alias=True) if trip.preferences_json else None,
    }


async def _get_match(db: AsyncSession, trip: Trip) -> Match:
    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")
    return match


def _member_ids(match: Match, user_id: str) -> tuple[str, str]:
    if user_id == match.user_id:
        return user_id, match.matched_user_id
    if user_id == match.matched_user_id:
        return user_id, match.user_id
    raise HTTPException(status_code=403, detail="이 여행의 참여자가 아닙니다.")


def _personal_out(row: TripUserPreference) -> dict:
    return {
        "userId": row.user_id,
        "preferences": row.preferences_json,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _compare_preferences(mine: dict | None, counterpart: dict | None) -> dict | None:
    if mine is None or counterpart is None:
        return None
    list_comparison = {}
    for key in ("places", "activities", "foods"):
        mine_values = mine.get(key, [])
        other_values = counterpart.get(key, [])
        list_comparison[key] = {
            "common": [value for value in mine_values if value in other_values],
            "onlyMine": [value for value in mine_values if value not in other_values],
            "onlyCounterpart": [value for value in other_values if value not in mine_values],
        }
    return {
        **list_comparison,
        "paceDifference": abs(mine.get("pace", 50) - counterpart.get("pace", 50)),
        "budgetDifference": abs(mine.get("budget", 50) - counterpart.get("budget", 50)),
        "indoorPreferredConflict": mine.get("indoorPreferred", False) != counterpart.get("indoorPreferred", False),
        "hiddenSpotsConflict": mine.get("hiddenSpots", False) != counterpart.get("hiddenSpots", False),
    }


def _to_out(trip: Trip) -> JointPreferenceOut:
    prefs = trip.preferences_json or DEFAULT_PREFERENCES
    return JointPreferenceOut(
        places=prefs.get("places", []),
        activities=prefs.get("activities", []),
        foods=prefs.get("foods", []),
        pace=prefs.get("pace", 50),
        budget=prefs.get("budget", 50),
        indoor_preferred=prefs.get("indoorPreferred", False),
        hidden_spots=prefs.get("hiddenSpots", False),
        title=trip.title,
        region=trip.region,
        date_from=trip.start_date,
        date_to=trip.end_date,
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
