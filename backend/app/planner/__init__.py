"""일정 생성기 모듈.

──────────────────────────────────────
파이프라인 (5단계)
──────────────────────────────────────
1. enricher.enrich_places       : 외부 데이터로 장소 정보 보강
2. day_assigner.assign          : 지역 클러스터링으로 일자별 분배
3. route_optimizer.optimize     : TSP로 하루치 순서 최적화 (Held-Karp)
4. time_scheduler.schedule      : 운영시간 윈도우 안에서 시간 배치
5. llm_narrator.narrate         : 각 슬롯에 자연스러운 설명 생성
"""
from .planner import ItineraryPlanner, PlanRequest
from .models import InputPlace, PlannedPlace, PlannedDay, PlannedSlot

__all__ = [
    "ItineraryPlanner",
    "PlanRequest",
    "InputPlace",
    "PlannedPlace",
    "PlannedDay",
    "PlannedSlot",
]
