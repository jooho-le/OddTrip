"""TimeScheduler 단위 테스트.

검증할 내용:
1. 영업시간 윈도우 안에 방문 배치
2. 점심/저녁 슬롯 자동 삽입
3. 영업 시작 전 도착 시 대기 슬롯
4. 휴무일 fallback
"""
from datetime import date, time

import pytest

from backend.app.clients.google_maps_client import Coordinate, RouteResult
from backend.app.clients.place_info_client import PlaceInfo
from backend.app.clients.weather_client import WeatherForecast
from backend.app.planner.day_assigner import AssignmentResult
from backend.app.planner.models import PlannedPlace
from backend.app.planner.route_optimizer import OptimizedRoute
from backend.app.planner.time_scheduler import TimeScheduler


# ══════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════
def make_place(
    name: str,
    open_h: int = 10,
    close_h: int = 18,
    stay_min: int = 90,
    indoor: bool = False,
    closed_today: bool = False,
) -> PlannedPlace:
    """테스트용 PlannedPlace. 모든 요일이 같은 영업시간."""
    if closed_today:
        opening_hours = [None] * 7
    else:
        opening_hours = [(time(open_h, 0), time(close_h, 0))] * 7

    return PlannedPlace(
        input_id=name,
        name=name,
        category="test",
        coord=Coordinate(lat=37.5, lng=127.0),
        info=PlaceInfo(
            opening_hours=opening_hours,
            avg_stay_minutes=stay_min,
            indoor=indoor,
        ),
    )


def make_assignment(
    places: list[PlannedPlace],
    target_date: date = date(2026, 6, 1),
) -> AssignmentResult:
    return AssignmentResult(
        target_date=target_date,
        weekday=target_date.weekday(),
        weather=WeatherForecast(
            target_date=target_date,
            condition="sunny",
            temperature=22.0,
            precipitation_prob=10,
            uv_index=5,
            description="맑음",
        ),
        places=places,
    )


def make_route(places: list[PlannedPlace]) -> OptimizedRoute:
    """순서는 입력 그대로, 이동시간은 모두 15분."""
    n = len(places)
    return OptimizedRoute(
        order=list(range(n)),
        total_duration_minutes=(n - 1) * 15,
        leg_durations=[15] * max(0, n - 1),
        leg_distances_m=[5000] * max(0, n - 1),
    )


# ══════════════════════════════════════════════════════
# 기본 스케줄링
# ══════════════════════════════════════════════════════
def test_basic_scheduling() -> None:
    """장소 3개를 배치하면 place / move / meal 슬롯이 적절히 들어감."""
    places = [
        make_place("A", open_h=9, close_h=20, stay_min=90),
        make_place("B", open_h=9, close_h=20, stay_min=90),
        make_place("C", open_h=9, close_h=20, stay_min=90),
    ]
    scheduler = TimeScheduler(pace=50)
    result = scheduler.schedule(
        day_number=1,
        assignment=make_assignment(places),
        route=make_route(places),
        disaster_alerts=[],
    )

    # 3개 장소 → 최소 3개의 place 슬롯
    place_slots = [s for s in result.slots if s.slot_type == "place"]
    assert len(place_slots) == 3

    # 이동 슬롯이 (장소 수 - 1)개
    move_slots = [s for s in result.slots if s.slot_type == "move"]
    assert len(move_slots) == 2  # A->B, B->C

    # 시간이 단조 증가
    times = [s.start_time for s in result.slots]
    for i in range(len(times) - 1):
        assert times[i] <= times[i + 1], (
            f"시간이 역행함: {times[i]} > {times[i+1]}"
        )


def test_lunch_slot_inserted() -> None:
    """점심 시간대(12-14시)에 식사 슬롯이 자동 삽입."""
    # 첫 장소 90분, 이동 15분이면 점심 시간대(12시 즈음)에 도달
    places = [
        make_place("A", open_h=9, close_h=20, stay_min=120),  # 10:00-12:00
        make_place("B", open_h=9, close_h=20, stay_min=90),
    ]
    scheduler = TimeScheduler(pace=50)
    result = scheduler.schedule(
        day_number=1,
        assignment=make_assignment(places),
        route=make_route(places),
        disaster_alerts=[],
    )

    meal_slots = [s for s in result.slots if s.slot_type == "meal"]
    lunch_slots = [s for s in meal_slots if "점심" in s.title]
    assert len(lunch_slots) >= 1, "점심 슬롯이 삽입되지 않음"


# ══════════════════════════════════════════════════════
# 영업시간 제약
# ══════════════════════════════════════════════════════
def test_wait_slot_before_opening() -> None:
    """영업 시작 전 도착 시 대기 슬롯이 들어감."""
    # 시작 10:00, 첫 장소는 14:00에 영업 시작
    # → 대기 슬롯이 약 4시간(240분) 들어가야 함
    places = [
        make_place("늦게여는곳", open_h=14, close_h=18, stay_min=60),
    ]
    scheduler = TimeScheduler(pace=50)
    result = scheduler.schedule(
        day_number=1,
        assignment=make_assignment(places),
        route=make_route(places),
        disaster_alerts=[],
    )

    rest_slots = [s for s in result.slots if s.slot_type == "rest"]
    assert len(rest_slots) >= 1, "영업 시작 전 대기 슬롯이 없음"
    # 대기 슬롯이 충분히 김 (최소 4시간 = 240분)
    assert rest_slots[0].duration_minutes >= 200


def test_closed_day_fallback() -> None:
    """휴무일인 장소는 '대체 추천' rest 슬롯으로 표시."""
    places = [
        make_place("휴무가게", closed_today=True),
    ]
    scheduler = TimeScheduler(pace=50)
    result = scheduler.schedule(
        day_number=1,
        assignment=make_assignment(places),
        route=make_route(places),
        disaster_alerts=[],
    )

    # rest 슬롯에 "휴무" 메시지가 있어야 함
    rest_slots = [s for s in result.slots if s.slot_type == "rest"]
    assert any("휴무" in s.title for s in rest_slots), (
        f"휴무 대체 슬롯이 없음. 슬롯들: {[s.title for s in result.slots]}"
    )


def test_no_visit_after_close() -> None:
    """영업 종료 시각 이후로는 방문 슬롯이 만들어지지 않음."""
    # 첫 장소 5시간 머무름 → 15:00 종료
    # 둘째 장소가 16:00에 닫는다면 체류 시간이 매우 짧아져서 스킵될 수 있음
    places = [
        make_place("A", open_h=10, close_h=20, stay_min=300),  # 10:00-15:00
        make_place("B", open_h=10, close_h=16, stay_min=60),   # 영업종료 임박
    ]
    scheduler = TimeScheduler(pace=50)
    result = scheduler.schedule(
        day_number=1,
        assignment=make_assignment(places),
        route=make_route(places),
        disaster_alerts=[],
    )

    # 모든 place 슬롯이 자기 영업시간 안에 있는지 확인
    for slot in result.slots:
        if slot.slot_type != "place" or not slot.place_ref:
            continue
        weekday = 0  # 월요일 (모든 요일 동일 설정이라 OK)
        opening = slot.place_ref.info.opening_hours[weekday]
        if opening is None:
            continue
        open_t, close_t = opening
        assert open_t <= slot.start_time, (
            f"{slot.title}: 영업 시작({open_t}) 전에 방문 ({slot.start_time})"
        )
        # 종료 시각이 영업 종료 시각을 넘으면 안 됨
        end_min = slot.start_time.hour * 60 + slot.start_time.minute + slot.duration_minutes
        close_min = close_t.hour * 60 + close_t.minute
        assert end_min <= close_min, (
            f"{slot.title}: 영업 종료({close_t})를 넘어 체류 (종료시각: {end_min}분)"
        )


# ══════════════════════════════════════════════════════
# Pace 영향
# ══════════════════════════════════════════════════════
def test_pace_affects_start_time() -> None:
    """pace 높으면 09:00, 낮으면 10:00 시작."""
    place = make_place("A", open_h=9, close_h=18, stay_min=60)
    assignment = make_assignment([place])
    route = make_route([place])

    # pace 50 → 10:00 시작
    s_low = TimeScheduler(pace=50)
    r_low = s_low.schedule(1, assignment, route, [])
    assert r_low.slots[0].start_time == time(10, 0)

    # pace 80 → 09:00 시작
    s_high = TimeScheduler(pace=80)
    r_high = s_high.schedule(1, assignment, route, [])
    assert r_high.slots[0].start_time == time(9, 0)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
