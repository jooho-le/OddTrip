import json

from openai import AsyncOpenAI, RateLimitError

from ..config import settings

client = AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None

MODEL = "gpt-4o-mini"


async def generate_attractions(
    user_a_code: str,
    user_a_scores: list[dict],
    user_b_code: str,
    user_b_scores: list[dict],
    preferences: dict,
    region: str = "서울",
) -> list[dict]:
    if not client:
        return _fallback_attractions()

    midpoint = _calc_midpoint(user_a_scores, user_b_scores)

    system_prompt = (
        "You are a travel recommendation AI for OddTrip. "
        "Two travelers with different personality types are planning a trip together. "
        "Recommend attractions that create a balanced experience for BOTH types. "
        "Always respond in Korean. Return a JSON array."
    )

    user_prompt = f"""
User A 여행 유형: {user_a_code} (점수: {json.dumps(user_a_scores, ensure_ascii=False)})
User B 여행 유형: {user_b_code} (점수: {json.dumps(user_b_scores, ensure_ascii=False)})
균형점 점수: {json.dumps(midpoint, ensure_ascii=False)}
공동 선호: {json.dumps(preferences, ensure_ascii=False)}
지역: {region}

아래 JSON 형식으로 4~6개 관광지를 추천해주세요:
[{{
  "name": "장소명",
  "category": "카테고리",
  "imageUrl": "",
  "description": "설명",
  "reason": "두 사용자 모두에게 적합한 이유",
  "tags": ["태그1", "태그2"],
  "indoor": true/false,
  "active": true/false,
  "famous": true/false
}}]
"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=30,
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return data.get("attractions", data) if isinstance(data, dict) else data
    except RateLimitError:
        raise
    except Exception:
        return _fallback_attractions()


async def resolve_conflict(
    user_a_code: str,
    user_b_code: str,
    preferences: dict,
    conflicts: list[str],
) -> str:
    if not client:
        return "두 분의 선호를 종합하면, 오전에는 활동적인 일정을, 오후에는 여유로운 시간을 배치하는 것이 좋겠습니다."

    system_prompt = (
        "You are a travel mediator AI. Two travelers have conflicting preferences. "
        "Suggest a concrete compromise that respects both perspectives. "
        "Keep the response under 3 sentences in Korean."
    )

    user_prompt = f"""
User A 유형: {user_a_code}
User B 유형: {user_b_code}
현재 선호: {json.dumps(preferences, ensure_ascii=False)}
충돌 영역: {', '.join(conflicts)}

구체적인 조정안을 제안해주세요.
"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            timeout=30,
        )
        return response.choices[0].message.content or ""
    except RateLimitError:
        raise
    except Exception:
        return "조정안을 생성하지 못했습니다. 잠시 후 다시 시도해주세요."


async def generate_itinerary(
    user_a_code: str,
    user_b_code: str,
    saved_attractions: list[dict],
    preferences: dict,
    days: int = 3,
) -> list[dict]:
    if not client:
        return _fallback_itinerary()

    system_prompt = (
        "You are a travel itinerary planner for OddTrip. "
        "Create a day-by-day itinerary that balances two different travel personalities. "
        "Always respond in Korean. Return a JSON object with an 'itinerary' key."
    )

    attractions_text = json.dumps(saved_attractions, ensure_ascii=False)
    prefs_text = json.dumps(preferences, ensure_ascii=False)

    user_prompt = f"""
User A 유형: {user_a_code}, User B 유형: {user_b_code}
저장된 관광지: {attractions_text}
선호: {prefs_text}
여행 기간: {days}일

아래 형식으로 일정을 생성해주세요:
{{
  "itinerary": [
    {{
      "day": 1,
      "title": "일차 제목",
      "weather": "날씨 정보",
      "caution": "주의사항",
      "items": [
        {{
          "time": "10:00",
          "type": "place|move|meal|rest",
          "title": "일정명",
          "location": "위치",
          "duration": "소요시간",
          "moveTime": "이동시간(선택)",
          "description": "설명",
          "aiReason": "AI 배치 이유"
        }}
      ]
    }}
  ]
}}
"""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            timeout=60,
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return data.get("itinerary", []) if isinstance(data, dict) else data
    except RateLimitError:
        raise
    except Exception:
        return _fallback_itinerary()


def _calc_midpoint(scores_a: list[dict], scores_b: list[dict]) -> list[dict]:
    midpoints = []
    for sa in scores_a:
        sb = next((s for s in scores_b if s.get("axis") == sa.get("axis")), sa)
        midpoints.append({
            "axis": sa.get("axis"),
            "score": round((sa.get("score", 0) + sb.get("score", 0)) / 2),
        })
    return midpoints


def _fallback_attractions() -> list[dict]:
    return [
        {
            "name": "청수당 익선",
            "category": "카페",
            "imageUrl": "",
            "description": "한옥 골목 안에서 조용히 쉬어갈 수 있는 감성 카페.",
            "reason": "휴식형 사용자에게는 긴 머무름을, 활동형 동행자에게는 주변 골목 탐색을 제공합니다.",
            "tags": ["실내", "휴식형", "숨은 명소"],
            "indoor": True,
            "active": False,
            "famous": False,
        },
        {
            "name": "북촌 전망 산책로",
            "category": "산책",
            "imageUrl": "",
            "description": "서울의 오래된 지붕선과 도심 풍경을 함께 보는 코스.",
            "reason": "유명 코스와 로컬 골목을 자연스럽게 연결해 서로의 취향을 절충합니다.",
            "tags": ["실외", "활동형", "유명"],
            "indoor": False,
            "active": True,
            "famous": True,
        },
    ]


def _fallback_itinerary() -> list[dict]:
    return [
        {
            "day": 1,
            "title": "균형 잡힌 시작",
            "weather": "맑음",
            "caution": "편한 신발을 권장합니다.",
            "items": [
                {
                    "time": "10:00",
                    "type": "place",
                    "title": "추천 관광지",
                    "location": "서울",
                    "duration": "90분",
                    "description": "두 여행자의 균형점에 맞는 장소입니다.",
                    "aiReason": "두 유형의 중간 성향에 부합합니다.",
                }
            ],
        }
    ]
