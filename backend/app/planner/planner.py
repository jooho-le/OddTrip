"""일정 생성기 메인 오케스트레이터.

──────────────────────────────────────
사용 예
──────────────────────────────────────
    from datetime import date
    from app.planner import ItineraryPlanner, PlanRequest, InputPlace

    places = [
        InputPlace(id="p1", name="국립현대미술관", category="박물관", famous=True),
        InputPlace(id="p2", name="청수당 익선", category="카페"),
        InputPlace(id="p3", name="북촌 전망 산책로", category="산책", active=True),
    ]

    planner = ItineraryPlanner.create_default()
    days = await planner.plan(PlanRequest(
        places=places,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 3),
        base_region="서울특별시",
        pace=55,
    ))
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Sequence

from ..clients import (
    DisasterClient,
    GoogleMapsClient,
    PlaceInfoClient,
    WeatherClient,
)
from ..clients.weather_client import WeatherForecast

from .day_assigner import DayAssigner
from .enricher import PlaceEnricher
from .llm_narrator import LLMNarrator
from .models import InputPlace, PlannedDay
from .route_optimizer import RouteOptimizer
from .time_scheduler import TimeScheduler


@dataclass
class PlanRequest:
    """일정 생성 요청.

    Attributes:
        places: 입력 장소 리스트 (DB 모델 의존성 없음)
        start_date: 여행 시작일
        end_date: 여행 종료일 (포함)
        base_region: 기준 지역 (재난 알림 조회용, 예: "서울특별시")
        pace: 일정 강도 0~100
        traveler_context: 여행자 성향 (LLM narrator에 전달)
    """
    places: Sequence[InputPlace]
    start_date: date
    end_date: date
    base_region: str = "서울특별시"
    pace: int = 50
    traveler_context: str = ""

    @property
    def num_days(self) -> int:
        return (self.end_date - self.start_date).days + 1


class ItineraryPlanner:
    """일정 생성 파이프라인 오케스트레이터.

    의존성 주입 패턴으로 클라이언트들을 외부에서 주입받습니다.
    테스트 시 mock 클라이언트로 교체 가능.
    """

    def __init__(
        self,
        google_maps: GoogleMapsClient,
        weather: WeatherClient,
        disaster: DisasterClient,
        place_info: PlaceInfoClient,
        narrator: LLMNarrator,
    ) -> None:
        self.google_maps = google_maps
        self.weather = weather
        self.disaster = disaster
        self.place_info = place_info
        self.narrator = narrator

    @classmethod
    def create_default(cls) -> "ItineraryPlanner":
        """기본 클라이언트들로 초기화."""
        return cls(
            google_maps=GoogleMapsClient(),
            weather=WeatherClient(),
            disaster=DisasterClient(),
            place_info=PlaceInfoClient(),
            narrator=LLMNarrator(),
        )

    async def plan(self, request: PlanRequest) -> list[PlannedDay]:
        """전체 파이프라인 실행."""
        # ─── 가드 절 ───
        if not request.places or request.num_days <= 0:
            return []

        # ─── Step 1: 장소 정보 보강 ───
        enricher = PlaceEnricher(self.google_maps, self.place_info)
        planned_places = await enricher.enrich_many(request.places)
        if not planned_places:
            return []

        # ─── Step 2: 날씨 정보 수집 ───
        center_coord = planned_places[0].coord
        weather_list = await self.weather.get_range_forecast(
            request.start_date,
            request.end_date,
            center_coord.lat,
            center_coord.lng,
        )
        weather_by_date: dict[date, WeatherForecast] = {
            w.target_date: w for w in weather_list
        }

        # ─── Step 3: 재난 알림 수집 ───
        all_alerts = await self.disaster.get_alerts(
            request.base_region,
            request.start_date,
            request.end_date,
        )
        alerts_by_date: dict[date, list] = {}
        for a in all_alerts:
            alerts_by_date.setdefault(a.issued_at.date(), []).append(a)

        # ─── Step 4: 일자별 분배 ───
        assigner = DayAssigner(pace=request.pace)
        assignments = assigner.assign(
            planned_places,
            request.start_date,
            request.end_date,
            weather_by_date,
        )

        # ─── Step 5: 각 날짜별 동선 최적화 + 시간 배치 ───
        optimizer = RouteOptimizer(self.google_maps)
        scheduler = TimeScheduler(pace=request.pace)
        planned_days: list[PlannedDay] = []

        for day_num, assignment in enumerate(assignments, start=1):
            if not assignment.places:
                continue

            route = await optimizer.optimize(
                assignment.places,
                fixed_start=False,
            )
            day_alerts = alerts_by_date.get(assignment.target_date, [])
            planned = scheduler.schedule(
                day_number=day_num,
                assignment=assignment,
                route=route,
                disaster_alerts=day_alerts,
            )
            planned_days.append(planned)

        # ─── Step 6: LLM 후처리 ───
        planned_days = await self.narrator.narrate(
            planned_days,
            traveler_context=request.traveler_context,
        )

        return planned_days
