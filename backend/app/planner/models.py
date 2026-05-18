"""일정 생성기 도메인 모델.

──────────────────────────────────────
모델 3종
──────────────────────────────────────
1. InputPlace        : 일정 생성기에 들어오는 입력 (DB 모델 의존성 없음)
2. PlannedPlace      : 외부 API로 보강된 중간 표현
3. PlannedSlot/Day   : 시간이 배치된 최종 결과

──────────────────────────────────────
InputPlace 설계 의도 (중요!)
──────────────────────────────────────
원래 OddTrip backend의 SQLAlchemy Attraction 모델을 그대로 받았지만,
standalone 동작과 테스트 용이성을 위해 자체 dataclass로 분리했습니다.

팀장님 통합 시:
  itinerary_service.py에서 DB의 Attraction을 InputPlace로 변환만 해주면 됩니다.

      # 어댑터 한 줄로 끝
      input_places = [
          InputPlace(
              id=a.id,
              name=a.name,
              category=a.category,
              description=a.description or "",
              famous=a.famous,
              active=a.active,
          )
          for a in saved_attractions
      ]
      plan_request = PlanRequest(places=input_places, ...)

──────────────────────────────────────
데이터 흐름
──────────────────────────────────────
   InputPlace (입력)
        ↓ PlaceEnricher
   PlannedPlace (좌표/운영시간 보강)
        ↓ RouteOptimizer + TimeScheduler
   PlannedSlot (시간 배치)
        ↓ 최종 결과
   PlannedDay (하루치 묶음)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, time
from typing import Optional

from ..clients.kakao_client import Coordinate
from ..clients.place_info_client import PlaceInfo
from ..clients.weather_client import WeatherForecast
from ..clients.disaster_client import DisasterAlert


# ══════════════════════════════════════════════════════
# 입력: DB 모델 의존성 없는 자체 dataclass
# ══════════════════════════════════════════════════════
@dataclass
class InputPlace:
    """일정 생성기 입력 장소.

    OddTrip backend의 Attraction(SQLAlchemy 모델) 대신 이걸 받습니다.
    이렇게 분리하면:
    - DB 없이 테스트 가능
    - DB 스키마 변경되어도 알고리즘 코드는 안 바뀜
    - 외부 시스템과 결합도 낮음 (Hexagonal Architecture)

    Attributes:
        id: 식별자 (DB의 Attraction.id 또는 임의 문자열)
        name: 장소 이름 (예: "국립현대미술관 서울")
        category: 카테고리 (예: "박물관", "카페", "축제", "숙소")
        description: 장소 설명
        famous: 유명도 (정렬 가중치)
        active: 활동성 (액티비티 위주인지)
    """
    id: str
    name: str
    category: str
    description: str = ""
    famous: bool = False
    active: bool = False


# ══════════════════════════════════════════════════════
# 중간 표현: 외부 API로 보강된 장소
# ══════════════════════════════════════════════════════
@dataclass
class PlannedPlace:
    """좌표/운영시간이 보강된 장소.

    PlaceEnricher가 InputPlace + 외부 API 응답을 합쳐 만듭니다.
    이 객체가 알고리즘의 1급 시민(first-class citizen)입니다.
    """
    input_id: str           # 원본 InputPlace.id 참조
    name: str
    category: str
    coord: Coordinate
    info: PlaceInfo         # 운영시간 + 체류시간 + 실내 여부
    description: str = ""
    famous: bool = False
    active: bool = False

    def coord_label(self) -> str:
        """time_scheduler에서 메시지에 쓰는 짧은 라벨."""
        return self.name


# ══════════════════════════════════════════════════════
# 최종 결과: 시간이 배치된 슬롯
# ══════════════════════════════════════════════════════
@dataclass
class PlannedSlot:
    """일정의 한 줄. 장소/이동/식사/휴식 중 하나.

    프론트엔드의 ItineraryItem과 거의 1:1 대응.
    팀장님이 통합 시 ItineraryItem(DB 모델)으로 변환합니다.

    Attributes:
        slot_type: "place" | "move" | "meal" | "rest"
        title: 표시 제목
        location: 위치 (장소면 카테고리, 이동이면 "이동")
        start_time: 시작 시각
        duration_minutes: 소요 시간 (분)
        description: 설명
        ai_reason: LLM이 생성한 추천 이유
        move_duration_minutes: 이동 슬롯 전용 - 이동 시간
        place_ref: 장소 슬롯 전용 - 원본 PlannedPlace 참조
    """
    slot_type: str
    title: str
    location: str
    start_time: time
    duration_minutes: int
    description: str = ""
    ai_reason: str = ""
    move_duration_minutes: Optional[int] = None
    place_ref: Optional[PlannedPlace] = None

    @property
    def end_time(self) -> time:
        total_minutes = (
            self.start_time.hour * 60
            + self.start_time.minute
            + self.duration_minutes
        )
        h, m = divmod(total_minutes, 60)
        h = min(h, 23)
        return time(h, m)


@dataclass
class PlannedDay:
    """하루치 일정."""
    day_number: int
    target_date: date
    title: str
    weather: WeatherForecast
    disaster_alerts: list[DisasterAlert] = field(default_factory=list)
    slots: list[PlannedSlot] = field(default_factory=list)
    caution: str = ""

    def total_duration_minutes(self) -> int:
        return sum(slot.duration_minutes for slot in self.slots)
