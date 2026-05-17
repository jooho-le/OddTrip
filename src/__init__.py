"""OddTrip 일정 자동 생성 + 동선 최적화 모듈.

──────────────────────────────────────
공개 API
──────────────────────────────────────
일반적인 사용:
    from src.planner import ItineraryPlanner, PlanRequest, InputPlace

    planner = ItineraryPlanner.create_default()
    plan = await planner.plan(PlanRequest(...))
"""
from .planner import ItineraryPlanner, PlanRequest, InputPlace
from .planner.models import PlannedDay, PlannedSlot

__all__ = [
    "ItineraryPlanner",
    "PlanRequest",
    "InputPlace",
    "PlannedDay",
    "PlannedSlot",
]
