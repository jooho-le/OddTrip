import asyncio
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trip import Attraction, Trip
from ..models.match import Match
from ..models.user import User
from ..schemas.attraction import AttractionOut, PublicAttractionGenerateRequest
from . import openai_service
from .tour_api_client import tour_api_client


CONTENT_TYPE_LABELS = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제",
    "28": "레포츠",
    "32": "숙박",
    "39": "음식점",
}

DEFAULT_CONTENT_TYPES = ["12", "14", "15", "28", "39"]


async def get_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
    result = await db.execute(
        select(Attraction).where(Attraction.trip_id == trip_id)
    )
    rows = result.scalars().all()
    return [
        AttractionOut(
            id=r.id,
            name=r.name,
            category=r.category,
            image_url=r.image_url,
            description=r.description,
            reason=r.reason,
            tags=r.tags_json or [],
            indoor=r.indoor,
            active=r.active,
            famous=r.famous,
            saved=r.saved,
            excluded=r.excluded,
        )
        for r in rows
    ]


async def generate_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
    trip = await db.get(Trip, trip_id)
    if not trip:
        return []

    match = await db.get(Match, trip.match_id)
    if not match:
        return []

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        return []

    # Delete existing attractions before regenerating
    old_result = await db.execute(
        select(Attraction).where(Attraction.trip_id == trip_id)
    )
    for old in old_result.scalars().all():
        await db.delete(old)

    raw = await openai_service.generate_attractions(
        user_a_code=user_a.tti_code or "",
        user_a_scores=user_a.tti_scores_json or [],
        user_b_code=user_b.tti_code or "",
        user_b_scores=user_b.tti_scores_json or [],
        preferences=trip.preferences_json or {},
    )

    attractions = []
    for item in raw:
        attr = Attraction(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            name=item.get("name", ""),
            category=item.get("category", ""),
            image_url=item.get("imageUrl", ""),
            description=item.get("description", ""),
            reason=item.get("reason", ""),
            tags_json=item.get("tags", []),
            indoor=item.get("indoor", False),
            active=item.get("active", False),
            famous=item.get("famous", False),
        )
        db.add(attr)
        attractions.append(attr)

    await db.commit()
    return [
        AttractionOut(
            id=a.id,
            name=a.name,
            category=a.category,
            image_url=a.image_url,
            description=a.description,
            reason=a.reason,
            tags=a.tags_json or [],
            indoor=a.indoor,
            active=a.active,
            famous=a.famous,
            saved=a.saved,
            excluded=a.excluded,
        )
        for a in attractions
    ]


async def generate_public_attractions(
    db: AsyncSession,
    trip_id: str,
    request: PublicAttractionGenerateRequest,
) -> list[AttractionOut]:
    trip = await db.get(Trip, trip_id)
    if not trip:
        return []

    match = await db.get(Match, trip.match_id)
    if not match:
        return []

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        return []

    try:
        raw_candidates = await _collect_public_candidates(request)
    except Exception:
        raw_candidates = []

    if not raw_candidates:
        return await generate_attractions(db, trip_id)

    ranked = _rank_public_candidates(
        raw_candidates,
        preferences=trip.preferences_json or {},
        user_a_code=user_a.tti_code or "",
        user_b_code=user_b.tti_code or "",
    )[: request.limit]

    enriched = await _enrich_public_candidates(ranked)

    await _delete_existing_attractions(db, trip_id)

    attractions = []
    for item in enriched:
        normalized = _to_attraction_payload(item)
        attr = Attraction(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            name=normalized["name"],
            category=normalized["category"],
            image_url=normalized["image_url"],
            description=normalized["description"],
            reason=_build_public_reason(normalized, user_a.tti_code or "", user_b.tti_code or ""),
            tags_json=normalized["tags"],
            indoor=normalized["indoor"],
            active=normalized["active"],
            famous=normalized["famous"],
        )
        db.add(attr)
        attractions.append(attr)

    await db.commit()
    return [_attraction_out(a) for a in attractions]


async def toggle_attraction(
    db: AsyncSession, trip_id: str, attraction_id: str, saved: bool | None, excluded: bool | None
) -> AttractionOut | None:
    result = await db.execute(
        select(Attraction).where(
            Attraction.id == attraction_id, Attraction.trip_id == trip_id
        )
    )
    attr = result.scalar_one_or_none()
    if not attr:
        return None

    if saved is not None:
        attr.saved = saved
    if excluded is not None:
        attr.excluded = excluded

    await db.commit()
    return AttractionOut(
        id=attr.id,
        name=attr.name,
        category=attr.category,
        image_url=attr.image_url,
        description=attr.description,
        reason=attr.reason,
        tags=attr.tags_json or [],
        indoor=attr.indoor,
        active=attr.active,
        famous=attr.famous,
        saved=attr.saved,
        excluded=attr.excluded,
    )


async def _collect_public_candidates(request: PublicAttractionGenerateRequest) -> list[dict[str, Any]]:
    content_type_ids = request.content_type_ids or DEFAULT_CONTENT_TYPES
    area_tasks = [
        tour_api_client.area_based_list(
            area_code=request.area_code,
            sigungu_code=request.sigungu_code,
            content_type_id=content_type_id,
            rows=request.rows_per_type,
        )
        for content_type_id in content_type_ids
    ]
    keyword_tasks = [
        tour_api_client.search_keyword(
            keyword=keyword,
            area_code=request.area_code,
            sigungu_code=request.sigungu_code,
            content_type_id=content_type_id,
            rows=max(3, request.rows_per_type // 2),
        )
        for keyword in request.keywords[:3]
        for content_type_id in content_type_ids
    ]

    results = await asyncio.gather(*area_tasks, *keyword_tasks, return_exceptions=True)
    candidates = []
    for result in results:
        if isinstance(result, list):
            candidates.extend(result)

    try:
        hub_items = await tour_api_client.hub_attractions(
            area_code=request.area_code,
            sigungu_code=request.sigungu_code,
            rows=30,
        )
    except Exception:
        hub_items = []

    hub_names = {_normalize_name(_get_value(item, "rlteTatsNm", "hubTatsNm", "title", "name")) for item in hub_items}
    deduped: dict[str, dict[str, Any]] = {}
    for item in candidates:
        key = str(_get_value(item, "contentid", "contentId", "title", "name"))
        if not key:
            continue
        merged = {**deduped.get(key, {}), **item}
        title = _normalize_name(_get_value(merged, "title", "name"))
        merged["_is_hub"] = bool(title and title in hub_names)
        deduped[key] = merged

    return list(deduped.values())


async def _enrich_public_candidates(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    async def get_detail(item: dict[str, Any]) -> dict[str, Any]:
        content_id = _get_value(item, "contentid", "contentId")
        content_type_id = _get_value(item, "contenttypeid", "contentTypeId")
        if not content_id:
            return item
        try:
            detail = await tour_api_client.detail_common(
                content_id=str(content_id),
                content_type_id=str(content_type_id) if content_type_id else None,
            )
            return _merge_detail(item, detail)
        except Exception:
            return item

    return await asyncio.gather(*(get_detail(item) for item in items))


def _rank_public_candidates(
    candidates: list[dict[str, Any]],
    *,
    preferences: dict[str, Any],
    user_a_code: str,
    user_b_code: str,
) -> list[dict[str, Any]]:
    hidden_preferred = bool(preferences.get("hiddenSpots", True))
    indoor_preferred = bool(preferences.get("indoorPreferred", False))
    pace = int(preferences.get("pace", 50) or 50)

    scored = []
    for item in candidates:
        content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
        score = 50
        tags = _public_tags(item)

        if item.get("_is_hub"):
            score += 12
        if hidden_preferred and "숨은 명소 후보" in tags:
            score += 14
        if indoor_preferred and "실내" in tags:
            score += 12
        if pace >= 60 and content_type_id in {"15", "28"}:
            score += 10
        if pace < 60 and content_type_id in {"14", "39"}:
            score += 10
        if _types_are_opposite(user_a_code, user_b_code) and content_type_id in {"12", "14"}:
            score += 6
        if _get_value(item, "firstimage", "firstImage", "firstimage2"):
            score += 4

        copied = dict(item)
        copied["_oddtrip_score"] = score
        scored.append(copied)

    return sorted(scored, key=lambda item: item.get("_oddtrip_score", 0), reverse=True)


def _to_attraction_payload(item: dict[str, Any]) -> dict[str, Any]:
    content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
    title = str(_get_value(item, "title", "name", "장소명 없음"))
    overview = str(_get_value(item, "overview", "description", "") or "")
    address = str(_get_value(item, "addr1", "address", "") or "")
    tags = _public_tags(item)
    category = CONTENT_TYPE_LABELS.get(content_type_id, "관광지")
    description = overview or address or "한국관광공사 TourAPI 기반으로 수집한 추천 후보입니다."

    return {
        "name": title,
        "category": category,
        "image_url": _get_value(item, "firstimage", "firstImage", "firstimage2") or "",
        "description": description,
        "tags": tags,
        "indoor": "실내" in tags,
        "active": content_type_id in {"15", "28"},
        "famous": bool(item.get("_is_hub") or content_type_id in {"12", "15"}),
    }


def _public_tags(item: dict[str, Any]) -> list[str]:
    content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
    tags = ["공공데이터"]

    if content_type_id in {"14", "32", "39"}:
        tags.append("실내")
    else:
        tags.append("실외")

    if content_type_id in {"15", "28"}:
        tags.append("활동형")
    else:
        tags.append("휴식형")

    if item.get("_is_hub"):
        tags.append("후속 코스 좋음")
    else:
        tags.append("숨은 명소 후보")

    return tags


def _build_public_reason(payload: dict[str, Any], user_a_code: str, user_b_code: str) -> str:
    balance = "서로 다른 여행 속도를 조율하기 좋은 후보입니다."
    if payload["active"]:
        balance = "활동형 동행자에게는 체험 포인트를, 휴식형 동행자에게는 일정의 변화를 제공합니다."
    if payload["indoor"]:
        balance = "날씨 변수에도 안정적으로 유지할 수 있어 공동 일정의 리스크를 낮춥니다."
    if user_a_code and user_b_code:
        return f"{payload['category']} 데이터와 두 사용자의 TTI({user_a_code}/{user_b_code})를 함께 고려했습니다. {balance}"
    return f"한국관광공사 TourAPI 후보를 기반으로 추천했습니다. {balance}"


def _merge_detail(item: dict[str, Any], detail: dict[str, Any] | None) -> dict[str, Any]:
    if not detail:
        return item
    return {**item, **{key: value for key, value in detail.items() if value not in (None, "")}}


async def _delete_existing_attractions(db: AsyncSession, trip_id: str) -> None:
    old_result = await db.execute(select(Attraction).where(Attraction.trip_id == trip_id))
    for old in old_result.scalars().all():
        await db.delete(old)


def _attraction_out(attr: Attraction) -> AttractionOut:
    return AttractionOut(
        id=attr.id,
        name=attr.name,
        category=attr.category,
        image_url=attr.image_url,
        description=attr.description,
        reason=attr.reason,
        tags=attr.tags_json or [],
        indoor=attr.indoor,
        active=attr.active,
        famous=attr.famous,
        saved=attr.saved,
        excluded=attr.excluded,
    )


def _get_value(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
    return None


def _normalize_name(value: Any) -> str:
    return str(value or "").strip().replace(" ", "")


def _types_are_opposite(user_a_code: str, user_b_code: str) -> bool:
    if len(user_a_code) != 4 or len(user_b_code) != 4:
        return False
    opposites = {("P", "W"), ("W", "P"), ("N", "C"), ("C", "N"), ("F", "A"), ("A", "F"), ("H", "S"), ("S", "H")}
    return sum((a, b) in opposites for a, b in zip(user_a_code, user_b_code)) >= 3
