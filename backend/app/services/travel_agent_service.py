from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..schemas.agent import AgentRunRequest, AgentRunResponse, AgentToolStep
from ..schemas.attraction import PublicAttractionGenerateRequest
from . import attraction_service, itinerary_service


client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_tourapi_candidates",
            "description": "한국관광공사 TourAPI에서 관광지, 축제, 숙박, 음식점 후보를 검색한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "areaCode": {"type": "string"},
                    "sigunguCode": {"type": "string"},
                    "keywords": {"type": "array", "items": {"type": "string"}},
                    "contentTypeIds": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer"},
                },
                "required": ["areaCode"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "collect_public_context",
            "description": "연관 관광지, 로컬 허브, 방문자 추이, 혼잡 예측 context를 수집한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "areaCode": {"type": "string"},
                    "sigunguCode": {"type": "string"},
                    "keyword": {"type": "string"},
                },
                "required": ["areaCode"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "rank_balanced_attractions",
            "description": "두 사용자의 TTI 균형점, 공동 선호, 혼잡 회피, 숨은 명소 점수를 반영해 후보를 랭킹한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer"},
                    "avoidCrowds": {"type": "boolean"},
                    "preferHidden": {"type": "boolean"},
                },
                "required": ["limit"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_executable_itinerary",
            "description": "저장/추천 관광지를 기반으로 날씨, 재난, 운영시간, 이동시간을 고려한 실행 가능한 일정을 생성한다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer"},
                    "pace": {"type": "integer"},
                },
                "required": ["days"],
            },
        },
    },
]


async def run_agent(
    db: AsyncSession,
    trip_id: str,
    request: AgentRunRequest,
) -> AgentRunResponse:
    if client:
        tool_plan = await _ask_model_for_tool_plan(request)
    else:
        tool_plan = _fallback_tool_plan(request)

    steps: list[AgentToolStep] = []
    recommended_ids: list[str] = []

    for planned in tool_plan:
        tool_name = str(planned.get("tool", ""))
        reason = str(planned.get("reason", ""))
        args = dict(planned.get("args", {}) or {})

        if tool_name == "search_tourapi_candidates":
            data = await attraction_service.generate_public_attractions(
                db,
                trip_id,
                PublicAttractionGenerateRequest(
                    area_code=str(args.get("areaCode") or request.area_code),
                    sigungu_code=args.get("sigunguCode") or request.sigungu_code,
                    keywords=list(args.get("keywords") or request.keywords),
                    content_type_ids=list(args.get("contentTypeIds") or request.content_type_ids),
                    limit=int(args.get("limit") or 8),
                    rows_per_type=6,
                    fast=True,
                ),
            )
            recommended_ids = [item.id for item in data]
            steps.append(AgentToolStep(tool=tool_name, reason=reason, args=args, result_count=len(data)))
            continue

        if tool_name == "collect_public_context":
            keyword = str(args.get("keyword") or (request.keywords[0] if request.keywords else "관광"))
            hub_items, related_items, trend_items, concentration_items = await attraction_service.collect_public_context(
                PublicAttractionGenerateRequest(
                    area_code=str(args.get("areaCode") or request.area_code),
                    sigungu_code=args.get("sigunguCode") or request.sigungu_code,
                    keywords=[keyword],
                    content_type_ids=request.content_type_ids,
                    limit=1,
                    fast=True,
                )
            )
            result_count = len(hub_items) + len(related_items) + len(trend_items) + len(concentration_items)
            steps.append(AgentToolStep(tool=tool_name, reason=reason, args=args, result_count=result_count))
            continue

        if tool_name == "rank_balanced_attractions":
            current = await attraction_service.get_attractions(db, trip_id)
            recommended_ids = [item.id for item in current[: int(args.get("limit") or 6)]]
            steps.append(AgentToolStep(tool=tool_name, reason=reason, args=args, result_count=len(recommended_ids)))
            continue

        if tool_name in {"prepare_itinerary_generation", "generate_executable_itinerary"}:
            if not request.generate_itinerary:
                steps.append(AgentToolStep(
                    tool="prepare_itinerary_generation",
                    reason="추천 후보를 일정 생성에 사용할 수 있도록 준비합니다.",
                    args=args,
                    result_count=0,
                ))
                continue
            itinerary = await itinerary_service.generate_itinerary(db, trip_id)
            steps.append(AgentToolStep(tool="generate_executable_itinerary", reason=reason, args=args, result_count=sum(len(day.items) for day in itinerary)))

    return AgentRunResponse(
        mode="tool-calling" if client else "deterministic-fallback",
        summary="AI 에이전트가 여행 조건에 맞춰 공공데이터 수집, context 보강, 균형점 랭킹, 일정 준비 순서를 결정했습니다.",
        steps=steps,
        recommended_attraction_ids=recommended_ids,
        next_actions=[
            "추천 관광지를 저장 또는 제외하세요.",
            "생성된 일정에서 부담스러운 슬롯은 공동 선호에서 조정하세요.",
        ],
    )


async def _ask_model_for_tool_plan(request: AgentRunRequest) -> list[dict[str, Any]]:
    prompt = {
        "areaCode": request.area_code,
        "sigunguCode": request.sigungu_code,
        "keywords": request.keywords,
        "contentTypeIds": request.content_type_ids,
        "days": request.days,
        "budget": request.budget,
        "pace": request.pace,
        "generateItinerary": request.generate_itinerary,
    }
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are OddTrip's travel tool-calling agent. "
                        "Choose which tools to call and in what order. "
                        "Return a JSON object with a steps array. Each step must have tool, reason, args."
                    ),
                },
                {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
            ],
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            response_format={"type": "json_object"},
            timeout=20,
        )
        message = response.choices[0].message
        if message.tool_calls:
            return [
                {
                    "tool": call.function.name,
                    "reason": f"{call.function.name} 실행이 필요하다고 판단했습니다.",
                    "args": json.loads(call.function.arguments or "{}"),
                }
                for call in message.tool_calls
            ]
        content = json.loads(message.content or "{}")
        steps = content.get("steps", [])
        return steps if isinstance(steps, list) else _fallback_tool_plan(request)
    except Exception:
        return _fallback_tool_plan(request)


def _fallback_tool_plan(request: AgentRunRequest) -> list[dict[str, Any]]:
    keywords = request.keywords or ["전시", "카페"]
    content_type_ids = request.content_type_ids or ["12", "14", "15", "28", "32", "39"]
    steps = [
        {
            "tool": "search_tourapi_candidates",
            "reason": "관광지, 축제, 숙박, 음식점 후보를 먼저 확보합니다.",
            "args": {
                "areaCode": request.area_code,
                "sigunguCode": request.sigungu_code,
                "keywords": keywords,
                "contentTypeIds": content_type_ids,
                "limit": 8,
            },
        },
        {
            "tool": "collect_public_context",
            "reason": "연관 관광지와 방문자/혼잡 context를 추천 점수에 반영합니다.",
            "args": {
                "areaCode": request.area_code,
                "sigunguCode": request.sigungu_code,
                "keyword": keywords[0],
            },
        },
        {
            "tool": "rank_balanced_attractions",
            "reason": "두 사용자의 성향 균형점과 혼잡 회피 조건으로 후보를 재정렬합니다.",
            "args": {
                "limit": 6,
                "avoidCrowds": True,
                "preferHidden": True,
            },
        },
        {
            "tool": "generate_executable_itinerary" if request.generate_itinerary else "prepare_itinerary_generation",
            "reason": "추천 후보를 일정 생성에 사용할 수 있도록 준비합니다." if not request.generate_itinerary else "추천 후보를 바탕으로 실제 시간대별 일정까지 생성합니다.",
            "args": {
                "days": request.days,
                "pace": request.pace,
            },
        },
    ]
    return steps
