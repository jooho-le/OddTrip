import asyncio
import uuid
from typing import Any

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trip import Place, Trip, TripAttraction
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

DEFAULT_CONTENT_TYPES = ["12", "14", "15", "28", "32", "39"]


async def get_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
    rows = await _load_trip_attractions(db, trip_id)
    return [_attraction_out(link, place) for link, place in rows]


async def _load_trip_attractions(
    db: AsyncSession, trip_id: str
) -> list[tuple[TripAttraction, Place]]:
    """Every read of a trip's attractions needs both halves, so always join."""
    result = await db.execute(
        select(TripAttraction, Place)
        .join(Place, Place.id == TripAttraction.place_id)
        .where(TripAttraction.trip_id == trip_id)
        .order_by(TripAttraction.score.desc().nullslast(), TripAttraction.created_at)
    )
    return [(link, place) for link, place in result.all()]


async def generate_attractions(db: AsyncSession, trip_id: str) -> list[AttractionOut]:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")

    await _delete_existing_attractions(db, trip_id)

    raw = await openai_service.generate_attractions(
        user_a_code=user_a.tti_code or "",
        user_a_scores=user_a.tti_scores_json or [],
        user_b_code=user_b.tti_code or "",
        user_b_scores=user_b.tti_scores_json or [],
        preferences=trip.preferences_json or {},
    )

    pairs: list[tuple[TripAttraction, Place]] = []
    for item in raw:
        # Model output has no stable identifier, so every run creates a new
        # place row rather than trying to match one by name.
        place = Place(
            id=str(uuid.uuid4()),
            name=item.get("name", ""),
            category=item.get("category", ""),
            image_url=item.get("imageUrl", ""),
            description=item.get("description", ""),
            indoor=bool(item.get("indoor", False)),
            active=bool(item.get("active", False)),
            source="OpenAI",
        )
        db.add(place)
        link = TripAttraction(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            place_id=place.id,
            reason=item.get("reason", ""),
            tags_json=item.get("tags", []),
            famous=bool(item.get("famous", False)),
        )
        db.add(link)
        pairs.append((link, place))

    await db.commit()
    return [_attraction_out(link, place) for link, place in pairs]


async def generate_public_attractions(
    db: AsyncSession,
    trip_id: str,
    request: PublicAttractionGenerateRequest,
) -> list[AttractionOut]:
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="여행 정보를 찾을 수 없습니다.")

    match = await db.get(Match, trip.match_id)
    if not match:
        raise HTTPException(status_code=404, detail="매칭 정보를 찾을 수 없습니다.")

    user_a = await db.get(User, match.user_id)
    user_b = await db.get(User, match.matched_user_id)
    if not user_a or not user_b:
        raise HTTPException(status_code=404, detail="매칭 사용자를 찾을 수 없습니다.")

    try:
        raw_candidates = await _collect_public_candidates(request)
    except Exception:
        raw_candidates = []

    if not raw_candidates:
        raw_candidates = _fallback_public_candidates(request)

    ranked = _rank_public_candidates(
        raw_candidates,
        preferences=trip.preferences_json or {},
        user_a_code=user_a.tti_code or "",
        user_b_code=user_b.tti_code or "",
        midpoint_scores=_calc_midpoint_scores(user_a.tti_scores_json or [], user_b.tti_scores_json or []),
    )[: request.limit]

    if request.fast:
        enrich_count = min(3, len(ranked))
        enriched = [
            *await _enrich_public_candidates(ranked[:enrich_count]),
            *ranked[enrich_count:],
        ]
    else:
        enriched = await _enrich_public_candidates(ranked)

    await _delete_existing_attractions(db, trip_id)

    pairs: list[tuple[TripAttraction, Place]] = []
    seen_place_ids: set[str] = set()
    for item in enriched:
        normalized = _to_attraction_payload(item)
        place = await _upsert_place(db, normalized, raw=item)
        # The unique (trip_id, place_id) constraint means the same place cannot
        # be linked twice; candidates that collapse onto one place keep the
        # first (highest ranked) occurrence.
        if place.id in seen_place_ids:
            continue
        seen_place_ids.add(place.id)

        link = TripAttraction(
            id=str(uuid.uuid4()),
            trip_id=trip_id,
            place_id=place.id,
            reason=_build_place_intro(normalized),
            tags_json=normalized["tags"],
            famous=normalized["famous"],
            score=item.get("_oddtrip_score"),
            congestion_score=normalized["congestion_score"],
            hidden_score=normalized["hidden_score"],
            related_rank=normalized["related_rank"],
        )
        db.add(link)
        pairs.append((link, place))

    await db.commit()
    return [_attraction_out(link, place) for link, place in pairs]


async def _upsert_place(db: AsyncSession, payload: dict[str, Any], *, raw: dict[str, Any]) -> Place:
    """Find the place by TourAPI content_id, or insert it.

    Rows without a content_id (OpenAI, fallback samples) cannot be matched
    reliably, so they always become a new row.
    """
    content_id = payload["content_id"] or None
    place: Place | None = None
    if content_id:
        result = await db.execute(select(Place).where(Place.content_id == content_id))
        place = result.scalar_one_or_none()

    if place is None:
        place = Place(id=str(uuid.uuid4()), content_id=content_id)
        db.add(place)

    # Refresh the place with the latest values seen from the API.
    place.content_type_id = payload["content_type_id"]
    place.source = payload["source"]
    place.name = payload["name"]
    place.category = payload["category"]
    place.image_url = payload["image_url"]
    place.description = payload["description"]
    place.addr1 = payload["addr1"]
    place.addr2 = payload["addr2"]
    place.latitude = _to_coord(payload["map_y"])
    place.longitude = _to_coord(payload["map_x"])
    place.area_code = payload["area_code"]
    place.sigungu_code = payload["sigungu_code"]
    place.tel = payload["tel"]
    place.homepage = payload["homepage"]
    place.opening_hours_json = payload["opening_hours"]
    place.closed_days_json = payload["closed_days"]
    place.indoor = payload["indoor"]
    place.active = payload["active"]
    place.raw_json = raw

    await db.flush()
    return place


def _to_coord(value: Any) -> float | None:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _coord_str(value: float | None) -> str | None:
    """Serialize back to the string form the API has always returned."""
    return None if value is None else f"{value:.6f}".rstrip("0").rstrip(".")


async def toggle_attraction(
    db: AsyncSession, trip_id: str, attraction_id: str, saved: bool | None, excluded: bool | None
) -> AttractionOut | None:
    result = await db.execute(
        select(TripAttraction, Place)
        .join(Place, Place.id == TripAttraction.place_id)
        .where(TripAttraction.id == attraction_id, TripAttraction.trip_id == trip_id)
    )
    row = result.one_or_none()
    if not row:
        return None
    link, place = row

    if saved is not None:
        link.saved = saved
    if excluded is not None:
        link.excluded = excluded

    await db.commit()
    return _attraction_out(link, place)


async def collect_public_context(
    request: PublicAttractionGenerateRequest,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    return await _collect_context_data_fast(request)


async def _collect_public_candidates(request: PublicAttractionGenerateRequest) -> list[dict[str, Any]]:
    content_type_ids = request.content_type_ids or DEFAULT_CONTENT_TYPES

    if request.fast:
        tasks = [
            tour_api_client.area_based_list(
                area_code=request.area_code,
                sigungu_code=request.sigungu_code,
                rows=max(20, request.limit * 4),
            )
        ]
        if request.keywords:
            tasks.append(
                tour_api_client.search_keyword(
                    keyword=request.keywords[0],
                    area_code=request.area_code,
                    sigungu_code=request.sigungu_code,
                    rows=max(10, request.limit * 2),
                )
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)
        candidates = []
        for result in results:
            if isinstance(result, list):
                candidates.extend(result)

        hub_items, related_items, trend_items, concentration_items = await _collect_context_data_fast(request)
        return _dedupe_candidates(
            candidates,
            hub_items=hub_items,
            related_items=related_items,
            trend_items=trend_items,
            concentration_items=concentration_items,
        )

    keyword_content_type_ids = [
        content_type_id
        for content_type_id in content_type_ids
        if content_type_id in {"12", "14", "39"}
    ] or content_type_ids[:3]
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
        for keyword in request.keywords[:2]
        for content_type_id in keyword_content_type_ids
    ]

    results = await asyncio.gather(*area_tasks, *keyword_tasks, return_exceptions=True)
    candidates = []
    for result in results:
        if isinstance(result, list):
            candidates.extend(result)

    hub_items, related_items, trend_items, concentration_items = await _collect_context_data(request)
    return _dedupe_candidates(
        candidates,
        hub_items=hub_items,
        related_items=related_items,
        trend_items=trend_items,
        concentration_items=concentration_items,
    )


def _dedupe_candidates(
    candidates: list[dict[str, Any]],
    *,
    hub_items: list[dict[str, Any]] | None = None,
    related_items: list[dict[str, Any]] | None = None,
    trend_items: list[dict[str, Any]] | None = None,
    concentration_items: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    hub_items = hub_items or []
    related_items = related_items or []
    trend_items = trend_items or []
    concentration_items = concentration_items or []

    hub_names = {_normalize_name(_get_value(item, "rlteTatsNm", "hubTatsNm", "title", "name")) for item in hub_items}
    related_ranks = _build_related_ranks(related_items)
    congestion_hint = _congestion_hint(trend_items, concentration_items)
    deduped: dict[str, dict[str, Any]] = {}
    for item in candidates:
        key = str(_get_value(item, "contentid", "contentId", "title", "name"))
        if not key:
            continue
        merged = {**deduped.get(key, {}), **item}
        title = _normalize_name(_get_value(merged, "title", "name"))
        merged["_is_hub"] = bool(title and title in hub_names)
        merged["_related_rank"] = related_ranks.get(title)
        merged["_congestion_hint"] = congestion_hint
        deduped[key] = merged

    return list(deduped.values())


def _fallback_public_candidates(request: PublicAttractionGenerateRequest) -> list[dict[str, Any]]:
    area_code = request.area_code or "1"
    return [
        {
            "contentid": f"fallback-{area_code}-1",
            "contenttypeid": "14",
            "title": "국립현대미술관 서울",
            "overview": "경복궁과 북촌 사이에 있는 현대미술관으로, 전시 관람 후 삼청동과 서촌 산책을 이어가기 좋습니다.",
            "addr1": "서울특별시 종로구 삼청로 30",
            "mapx": "126.980003",
            "mapy": "37.578631",
            "firstimage": "https://images.unsplash.com/photo-1545987796-200677ee1011?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 42,
            "_source_status": "fallback",
        },
        {
            "contentid": f"fallback-{area_code}-2",
            "contenttypeid": "12",
            "title": "북촌 한옥마을 골목",
            "overview": "한옥 지붕선과 좁은 골목을 따라 걷는 동네 산책 코스입니다. 사진을 찍거나 조용히 걷기 좋은 구간이 많습니다.",
            "addr1": "서울특별시 종로구 계동길 37",
            "mapx": "126.986923",
            "mapy": "37.582604",
            "firstimage": "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 58,
            "_source_status": "fallback",
        },
        {
            "contentid": f"fallback-{area_code}-3",
            "contenttypeid": "39",
            "title": "익선동 한옥 카페 거리",
            "overview": "낮은 한옥 건물 사이로 카페와 작은 식당이 모여 있는 거리입니다. 식사와 휴식을 한 번에 넣기 좋은 장소입니다.",
            "addr1": "서울특별시 종로구 익선동",
            "mapx": "126.989851",
            "mapy": "37.572209",
            "firstimage": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 47,
            "_source_status": "fallback",
        },
        {
            "contentid": f"fallback-{area_code}-4",
            "contenttypeid": "28",
            "title": "청계천 산책로",
            "overview": "도심 한가운데 물길을 따라 걷는 산책 코스입니다. 이동 중간에 쉬어가거나 가벼운 야간 산책으로 넣기 좋습니다.",
            "addr1": "서울특별시 종로구 청계천로",
            "mapx": "126.978388",
            "mapy": "37.569107",
            "firstimage": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 33,
            "_source_status": "fallback",
        },
        {
            "contentid": f"fallback-{area_code}-5",
            "contenttypeid": "15",
            "title": "서울빛초롱축제 권역",
            "overview": "청계천 일대에 조명 전시와 야간 볼거리가 모이는 축제 구간입니다. 사진과 야경을 좋아하는 일정에 잘 맞습니다.",
            "addr1": "서울특별시 종로구 세종대로",
            "mapx": "126.976837",
            "mapy": "37.572006",
            "firstimage": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 68,
            "_source_status": "fallback",
        },
        {
            "contentid": f"fallback-{area_code}-6",
            "contenttypeid": "32",
            "title": "종로 부티크 스테이",
            "overview": "종로 중심부에 머물며 주변 골목, 식당, 지하철 동선을 짧게 가져갈 수 있는 숙박 후보입니다.",
            "addr1": "서울특별시 종로구 수표로",
            "mapx": "126.991773",
            "mapy": "37.570387",
            "firstimage": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
            "_congestion_hint": 29,
            "_source_status": "fallback",
        },
    ][: request.limit]


async def _collect_context_data(request: PublicAttractionGenerateRequest) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    async def safe(coro):
        try:
            return await coro
        except Exception:
            return []

    keyword = request.keywords[0] if request.keywords else "관광"
    return await asyncio.gather(
        safe(tour_api_client.hub_attractions(area_code=request.area_code, sigungu_code=request.sigungu_code, rows=50)),
        safe(tour_api_client.related_attractions_by_keyword(keyword=keyword, rows=50)),
        safe(tour_api_client.visitor_trend(areaCd=request.area_code, signguCd=request.sigungu_code or "", numOfRows=20)),
        safe(tour_api_client.concentration_prediction(areaCd=request.area_code, signguCd=request.sigungu_code or "", numOfRows=20)),
    )


async def _collect_context_data_fast(request: PublicAttractionGenerateRequest) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    try:
        return await asyncio.wait_for(_collect_context_data(request), timeout=2.0)
    except Exception:
        return [], [], [], []


async def _enrich_public_candidates(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    async def get_detail(item: dict[str, Any]) -> dict[str, Any]:
        content_id = _get_value(item, "contentid", "contentId")
        content_type_id = _get_value(item, "contenttypeid", "contentTypeId")
        if not content_id:
            return item
        try:
            common_task = tour_api_client.detail_common(
                content_id=str(content_id),
                content_type_id=str(content_type_id) if content_type_id else None,
            )
            intro_task = (
                tour_api_client.detail_intro(
                    content_id=str(content_id),
                    content_type_id=str(content_type_id),
                )
                if content_type_id
                else None
            )
            if intro_task:
                common, intro = await asyncio.gather(common_task, intro_task)
            else:
                common, intro = await common_task, None
            return _merge_detail(_merge_detail(item, common), intro)
        except Exception:
            return item

    return await asyncio.gather(*(get_detail(item) for item in items))


def _rank_public_candidates(
    candidates: list[dict[str, Any]],
    *,
    preferences: dict[str, Any],
    user_a_code: str,
    user_b_code: str,
    midpoint_scores: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    hidden_preferred = bool(preferences.get("hiddenSpots", True))
    indoor_preferred = bool(preferences.get("indoorPreferred", False))
    pace = int(preferences.get("pace", 50) or 50)
    midpoint_scores = midpoint_scores or {}

    scored = []
    for item in candidates:
        content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
        score = 50
        tags = _public_tags(item)
        hidden_score = _hidden_score(item)
        congestion_score = _congestion_score(item)
        place_axis_scores = _infer_place_axis_scores(item)

        if item.get("_is_hub"):
            score += 12
        if hidden_preferred and "숨은 명소 후보" in tags:
            score += 8 + hidden_score // 10
        if indoor_preferred and "실내" in tags:
            score += 12
        if pace >= 60 and content_type_id in {"15", "28"}:
            score += 10
        if pace < 60 and content_type_id in {"14", "39"}:
            score += 10
        if _types_are_opposite(user_a_code, user_b_code) and content_type_id in {"12", "14"}:
            score += 6
        score += _midpoint_fit_score(item, midpoint_scores, place_axis_scores)
        score += _traveler_fit_score(place_axis_scores, user_a_code, user_b_code)
        if _get_value(item, "firstimage", "firstImage", "firstimage2"):
            score += 4
        if item.get("_related_rank"):
            score += max(0, 12 - int(item["_related_rank"] or 99) // 5)
        score -= max(0, congestion_score - 65) // 8

        copied = dict(item)
        copied["_oddtrip_score"] = score
        copied["_hidden_score"] = hidden_score
        copied["_congestion_score"] = congestion_score
        copied["_tti_axis_scores"] = place_axis_scores
        scored.append(copied)

    return sorted(scored, key=lambda item: item.get("_oddtrip_score", 0), reverse=True)


def _calc_midpoint_scores(user_a_scores: list[dict], user_b_scores: list[dict]) -> dict[str, float]:
    by_axis_b = {str(score.get("axis")): score for score in user_b_scores}
    midpoint: dict[str, float] = {}
    for score_a in user_a_scores:
        axis = str(score_a.get("axis") or "")
        if not axis:
            continue
        score_b = by_axis_b.get(axis, score_a)
        try:
            value_a = float(score_a.get("score", 0))
            value_b = float(score_b.get("score", 0))
        except (TypeError, ValueError):
            value_a = 0
            value_b = 0
        midpoint[axis] = round((value_a + value_b) / 2, 2)
    return midpoint


def _midpoint_fit_score(
    item: dict[str, Any],
    midpoint_scores: dict[str, float],
    place_axis_scores: dict[str, int] | None = None,
) -> int:
    if not midpoint_scores:
        return 0

    content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
    hidden_score = _hidden_score(item)
    congestion_score = _congestion_score(item)
    score = 0

    nc = midpoint_scores.get("NC", 0)
    fa = midpoint_scores.get("FA", 0)
    hs = midpoint_scores.get("HS", 0)

    # NC: negative means novelty-seeking, positive means proven/conservative.
    if nc < -0.5 and hidden_score >= 55:
        score += 8
    if nc > 0.5 and (item.get("_is_hub") or content_type_id in {"12", "14", "39"}):
        score += 6

    # FA: negative means slower/restful, positive means active.
    if fa < -0.5 and content_type_id in {"14", "32", "39"}:
        score += 8
    if fa > 0.5 and content_type_id in {"15", "28", "12"}:
        score += 8

    # HS: negative means hidden/local, positive means famous/sightseeing.
    if hs < -0.5 and hidden_score >= 60 and congestion_score <= 65:
        score += 8
    if hs > 0.5 and (item.get("_is_hub") or content_type_id in {"12", "15"}):
        score += 8

    # Midpoint near zero means a compromise candidate is better than an extreme one.
    if abs(nc) <= 0.5 and abs(fa) <= 0.5 and abs(hs) <= 0.5:
        score += 6

    if place_axis_scores:
        # Compare person midpoint and place personality on the same 4 axes.
        # Lower distance means "new but not too burdensome" for both travelers.
        total_distance = 0.0
        compared = 0
        for axis, midpoint in midpoint_scores.items():
            if axis in place_axis_scores:
                total_distance += abs(float(midpoint) - float(place_axis_scores[axis]))
                compared += 1
        if compared:
            avg_distance = total_distance / compared
            score += max(0, int(12 - avg_distance * 4))

    return score


def _to_attraction_payload(item: dict[str, Any]) -> dict[str, Any]:
    content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
    title = str(_get_value(item, "title", "name", "장소명 없음"))
    overview = str(_get_value(item, "overview", "description", "") or "")
    address = str(_get_value(item, "addr1", "address", "") or "")
    tags = _public_tags(item)
    category = CONTENT_TYPE_LABELS.get(content_type_id, "관광지")
    description = overview or address or "한국관광공사 TourAPI 기반으로 수집한 추천 후보입니다."
    opening_hours, closed_days = _extract_opening_hours(item, content_type_id)
    axis_scores = dict(item.get("_tti_axis_scores") or _infer_place_axis_scores(item))

    return {
        "name": title,
        "category": category,
        "image_url": _get_value(item, "firstimage", "firstImage", "firstimage2") or "",
        "description": description,
        "tags": [*tags, *_axis_score_tags(axis_scores)],
        "indoor": "실내" in tags,
        "active": content_type_id in {"15", "28"},
        "famous": bool(item.get("_is_hub") or content_type_id in {"12", "15"}),
        "source": "Fallback" if item.get("_source_status") == "fallback" else "TourAPI",
        "content_id": str(_get_value(item, "contentid", "contentId", "") or ""),
        "content_type_id": content_type_id,
        "addr1": str(_get_value(item, "addr1", "address", "") or ""),
        "addr2": str(_get_value(item, "addr2", "") or ""),
        "map_x": str(_get_value(item, "mapx", "mapX", "") or ""),
        "map_y": str(_get_value(item, "mapy", "mapY", "") or ""),
        "area_code": str(_get_value(item, "areacode", "areaCode", "") or ""),
        "sigungu_code": str(_get_value(item, "sigungucode", "sigunguCode", "") or ""),
        "tel": str(_get_value(item, "tel", "") or ""),
        "homepage": str(_get_value(item, "homepage", "") or ""),
        "opening_hours": opening_hours,
        "closed_days": closed_days,
        "congestion_score": _congestion_score(item),
        "hidden_score": _hidden_score(item),
        "related_rank": item.get("_related_rank"),
        "axis_scores": axis_scores,
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
    congestion = _congestion_score(item)
    if congestion >= 70:
        tags.append("혼잡 주의")
    elif congestion <= 35:
        tags.append("혼잡 낮음")
    if item.get("_related_rank"):
        tags.append(f"연관 {item['_related_rank']}위")

    return tags


def _build_place_intro(payload: dict[str, Any]) -> str:
    description = str(payload.get("description") or "").strip()
    address = str(payload.get("addr1") or "").strip()
    if description and description != address and "한국관광공사 TourAPI 기반" not in description:
        return description

    name = payload.get("name") or "이 장소"
    category = payload.get("category") or "여행지"
    detail_text = _place_detail_text(payload)
    return f"{name}은 {detail_text}"


def _place_detail_text(payload: dict[str, Any]) -> str:
    category = str(payload.get("category") or "여행지")
    content_type_id = str(payload.get("content_type_id") or "")
    name = str(payload.get("name") or "")

    menu = str(payload.get("firstmenu") or payload.get("treatmenu") or "").strip()
    sale_item = str(payload.get("saleitem") or "").strip()
    event_place = str(payload.get("eventplace") or "").strip()

    if menu:
        return f"{menu}을 중심으로 즐길 수 있는 음식점입니다."
    if sale_item:
        return f"{sale_item} 등을 둘러볼 수 있는 쇼핑 장소입니다."
    if event_place:
        return f"{event_place} 일대에서 열리는 축제/행사 장소입니다."

    lowered = name.lower()
    if "카페" in name or "coffee" in lowered:
        return "커피와 디저트를 즐기며 쉬어가기 좋은 카페입니다."
    if any(word in name for word in ("시장", "마켓")):
        return "먹거리와 작은 상점들을 함께 둘러볼 수 있는 시장입니다."
    if any(word in name for word in ("미술관", "박물관", "전시")) or content_type_id == "14":
        return "전시와 작품을 관람하며 실내에서 시간을 보내기 좋은 문화 공간입니다."
    if any(word in name for word in ("한옥", "골목", "마을")):
        return "동네 골목과 건물 분위기를 천천히 걸으며 즐기는 산책형 장소입니다."
    if any(word in name for word in ("축제", "페스티벌")) or content_type_id == "15":
        return "공연, 조명, 체험 같은 볼거리가 모이는 행사 장소입니다."
    if any(word in name for word in ("산책", "공원", "천", "해변", "바다")) or content_type_id == "28":
        return "가볍게 걷거나 사진을 남기기 좋은 야외 코스입니다."
    if content_type_id == "39":
        return "지역 음식과 휴식을 일정에 넣기 좋은 음식점 후보입니다."
    if content_type_id == "32":
        return "이동 동선을 짧게 가져가기 위한 숙박 후보입니다."

    return f"{category}로 분류된 장소로, 일정 중간에 둘러보기 좋은 후보입니다."


def _infer_place_axis_scores(item: dict[str, Any]) -> dict[str, int]:
    """Infer place personality on the same axes used by user TTI.

    Scores use the same -2..2 range:
    PW: spontaneous/easy (-) vs planned/reservation-friendly (+)
    NC: novel/local (-) vs proven/stable (+)
    FA: restful (-) vs active (+)
    HS: hidden/local (-) vs famous/sightseeing (+)
    """
    content_type_id = str(_get_value(item, "contenttypeid", "contentTypeId", ""))
    hidden_score = _hidden_score(item)
    congestion_score = _congestion_score(item)
    is_hub = bool(item.get("_is_hub"))
    has_detail = bool(_get_value(item, "homepage", "tel", "overview"))

    pw = 1 if has_detail or content_type_id in {"15", "32"} else 0
    nc = -1 if hidden_score >= 60 else 1
    fa = 2 if content_type_id in {"15", "28"} else (-1 if content_type_id in {"14", "32", "39"} else 0)
    hs = 2 if is_hub or content_type_id in {"12", "15"} else (-1 if hidden_score >= 65 and congestion_score <= 60 else 0)

    if congestion_score >= 75:
        hs = max(hs, 1)
        nc = max(nc, 0)
    if content_type_id == "39":
        pw = max(pw, 1)
    if content_type_id == "32":
        pw = 2
        fa = -2

    return {
        "PW": _clamp_axis_score(pw),
        "NC": _clamp_axis_score(nc),
        "FA": _clamp_axis_score(fa),
        "HS": _clamp_axis_score(hs),
    }


def _clamp_axis_score(value: int) -> int:
    return max(-2, min(2, int(value)))


def _axis_score_tags(axis_scores: dict[str, int]) -> list[str]:
    labels = {
        "PW": ("즉흥형 장소", "계획형 장소"),
        "NC": ("새로움", "검증됨"),
        "FA": ("휴식형", "활동형"),
        "HS": ("숨은 명소형", "대표 명소형"),
    }
    tags = []
    for axis, score in axis_scores.items():
        if axis not in labels or score == 0:
            continue
        left, right = labels[axis]
        tags.append(left if score < 0 else right)
    return tags


def _axis_summary(axis_scores: dict[str, int]) -> str:
    tags = _axis_score_tags(axis_scores)
    if not tags:
        return "장소 성향은 두 사람의 중간 지점에 가깝습니다."
    return f"장소 성향({', '.join(tags[:3])})도 함께 반영했습니다."


def _traveler_fit_score(axis_scores: dict[str, int], user_a_code: str, user_b_code: str) -> int:
    """Reward places that cover either traveler's stronger TTI letters.

    A perfectly opposite pair often has a midpoint near zero. If we only score
    the midpoint, every pair drifts toward the same generic compromise. This
    adds controlled variety by giving credit when a place satisfies one side's
    clear preference while still being close enough to the pair balance.
    """
    total = 0
    for code in (user_a_code, user_b_code):
        if len(code) != 4:
            continue
        desired = {
            "PW": -1 if code[0] == "P" else 1,
            "NC": -1 if code[1] == "N" else 1,
            "FA": -1 if code[2] == "F" else 1,
            "HS": -1 if code[3] == "H" else 1,
        }
        for axis, direction in desired.items():
            place_score = axis_scores.get(axis, 0)
            if place_score == 0:
                continue
            if place_score * direction > 0:
                total += 3
            elif abs(place_score) >= 2:
                total -= 2
    return max(-8, min(18, total))


def _merge_detail(item: dict[str, Any], detail: dict[str, Any] | None) -> dict[str, Any]:
    if not detail:
        return item
    return {**item, **{key: value for key, value in detail.items() if value not in (None, "")}}


async def _delete_existing_attractions(db: AsyncSession, trip_id: str) -> None:
    """Drop this trip's links only. The shared place rows stay."""
    await db.execute(delete(TripAttraction).where(TripAttraction.trip_id == trip_id))
    await db.flush()


def _attraction_out(link: TripAttraction, place: Place) -> AttractionOut:
    """Flatten the two rows back into the shape the API has always returned."""
    return AttractionOut(
        id=link.id,
        name=place.name,
        category=place.category,
        image_url=place.image_url,
        description=place.description,
        reason=link.reason,
        tags=link.tags_json or [],
        indoor=place.indoor,
        active=place.active,
        famous=link.famous,
        saved=link.saved,
        excluded=link.excluded,
        content_id=place.content_id,
        content_type_id=place.content_type_id,
        source=place.source,
        addr1=place.addr1,
        addr2=place.addr2,
        map_x=_coord_str(place.longitude),
        map_y=_coord_str(place.latitude),
        area_code=place.area_code,
        sigungu_code=place.sigungu_code,
        tel=place.tel,
        homepage=place.homepage,
        opening_hours=place.opening_hours_json,
        closed_days=place.closed_days_json or [],
        congestion_score=link.congestion_score,
        hidden_score=link.hidden_score,
        related_rank=link.related_rank,
    )


def _get_value(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in item and item[key] not in (None, ""):
            return item[key]
    return None


def _normalize_name(value: Any) -> str:
    return str(value or "").strip().replace(" ", "")


def _build_related_ranks(items: list[dict[str, Any]]) -> dict[str, int]:
    ranks: dict[str, int] = {}
    for idx, item in enumerate(items, start=1):
        name = _normalize_name(_get_value(item, "rlteTatsNm", "rlteTatsName", "title", "name"))
        if name and name not in ranks:
            raw_rank = _get_value(item, "rlteRank", "rank", "rlteTatsRank")
            try:
                ranks[name] = int(raw_rank)
            except (TypeError, ValueError):
                ranks[name] = idx
    return ranks


def _congestion_hint(trend_items: list[dict[str, Any]], concentration_items: list[dict[str, Any]]) -> int:
    values = []
    for item in trend_items + concentration_items:
        for key in ("touNum", "visitorCnt", "visitCnt", "cnctrRate", "congestion", "predictValue"):
            value = _get_value(item, key)
            try:
                values.append(float(str(value).replace(",", "")))
            except (TypeError, ValueError):
                continue
    if not values:
        return 45
    avg = sum(values) / len(values)
    if avg <= 1:
        return int(avg * 100)
    return max(20, min(85, int(avg) % 100))


def _congestion_score(item: dict[str, Any]) -> int:
    hint = int(item.get("_congestion_hint") or 45)
    if item.get("_is_hub"):
        hint += 20
    if item.get("_related_rank") and int(item["_related_rank"]) <= 10:
        hint += 10
    return max(10, min(95, hint))


def _hidden_score(item: dict[str, Any]) -> int:
    score = 72
    if item.get("_is_hub"):
        score -= 35
    rank = item.get("_related_rank")
    if rank:
        score -= max(0, 20 - int(rank))
    score -= max(0, _congestion_score(item) - 55) // 2
    if not _get_value(item, "firstimage", "firstImage", "firstimage2"):
        score -= 8
    return max(5, min(95, score))


def _extract_opening_hours(item: dict[str, Any], content_type_id: str) -> tuple[dict | None, list[str]]:
    raw = " ".join(str(_get_value(item, key) or "") for key in ("usetime", "usetimefestival", "opentime", "restdate", "restdateleports"))
    closed_days = []
    for label in ("월", "화", "수", "목", "금", "토", "일"):
        if f"{label}요일 휴" in raw or f"{label} 휴" in raw:
            closed_days.append(label)
    if not raw.strip():
        return None, closed_days
    return {"raw": raw.strip(), "contentTypeId": content_type_id}, closed_days


def _types_are_opposite(user_a_code: str, user_b_code: str) -> bool:
    if len(user_a_code) != 4 or len(user_b_code) != 4:
        return False
    opposites = {("P", "W"), ("W", "P"), ("N", "C"), ("C", "N"), ("F", "A"), ("A", "F"), ("H", "S"), ("S", "H")}
    return sum((a, b) in opposites for a, b in zip(user_a_code, user_b_code)) >= 3
