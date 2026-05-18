"""시간 슬롯 배치 모듈.

──────────────────────────────────────
역할
──────────────────────────────────────
RouteOptimizer가 결정한 순서대로 장소를 방문할 때, 각 장소에 실제 시각을 부여.

규칙:
- 시작 시각: 기본 10:00 (pace ≥ 70이면 09:00)
- 영업시간 윈도우 안에서만 방문
- 영업 시작 전 도착 → 대기 슬롯 자동 삽입
- 점심 슬롯: 12:00~14:00 사이 자동 (60분)
- 저녁 슬롯: 18:00~20:00 사이 자동 (90분)
- 이동시간: 카카오 API 결과 그대로
- 22시 이후 일정 끌지 않음
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from ..clients.weather_client import WeatherForecast
from ..clients.disaster_client import DisasterAlert
from .day_assigner import AssignmentResult
from .models import PlannedDay, PlannedPlace, PlannedSlot
from .route_optimizer import OptimizedRoute


class TimeScheduler:
    """장소 순서 + 영업시간 -> 시간 배치된 슬롯 시퀀스."""

    def __init__(self, pace: int = 50) -> None:
        self.pace = pace

    def schedule(
        self,
        day_number: int,
        assignment: AssignmentResult,
        route: OptimizedRoute,
        disaster_alerts: list[DisasterAlert],
    ) -> PlannedDay:
        """하루치 일정 슬롯을 시간 순서대로 생성."""
        start_clock = self._daily_start_time()
        current = _combine(assignment.target_date, start_clock)

        slots: list[PlannedSlot] = []
        meal_added = {"lunch": False, "dinner": False}

        ordered_places = [assignment.places[i] for i in route.order]
        leg_durations = route.leg_durations

        for idx, place in enumerate(ordered_places):

            # ─── 1. 이동 (첫 장소는 스킵) ───
            if idx > 0:
                move_min = (
                    leg_durations[idx - 1]
                    if idx - 1 < len(leg_durations)
                    else 15
                )
                slots.append(_make_move_slot(current.time(), move_min, place.name))
                current += timedelta(minutes=move_min)

            # ─── 2. 식사 슬롯 자동 삽입 ───
            current, slots, meal_added = _maybe_insert_meal(
                current, slots, meal_added, place.coord_label()
            )

            # ─── 3. 영업시간 체크 ───
            weekday = assignment.weekday
            open_close = place.info.opening_hours[weekday]

            if open_close is None:
                # 휴무인데 여기까지 왔다면 (안전장치)
                slots.append(
                    PlannedSlot(
                        slot_type="rest",
                        title=f"{place.name} (오늘 휴무 - 대체 추천)",
                        location=place.name,
                        start_time=current.time(),
                        duration_minutes=30,
                        description="해당 일자에 휴무이므로 짧은 대체 일정을 안내합니다.",
                        place_ref=place,
                    )
                )
                current += timedelta(minutes=30)
                continue

            open_t, close_t = open_close

            # 영업 시작 전 도착 → 대기 슬롯
            if current.time() < open_t:
                wait_min = _minutes_between(current.time(), open_t)
                if wait_min >= 15:
                    slots.append(
                        PlannedSlot(
                            slot_type="rest",
                            title="근처에서 잠시 대기",
                            location=place.name,
                            start_time=current.time(),
                            duration_minutes=wait_min,
                            description=f"{place.name} 영업 시작까지 가벼운 산책이나 카페 휴식을 권장합니다.",
                        )
                    )
                current = _combine(assignment.target_date, open_t)

            # 영업 종료 시각을 넘기지 않게 체류 시간 조정
            stay = place.info.avg_stay_minutes
            max_stay = max(0, _minutes_between(current.time(), close_t))
            stay = min(stay, max_stay)
            if stay < 30:
                continue  # 너무 짧으면 실질 방문 불가

            # ─── 4. 장소 슬롯 추가 ───
            slots.append(
                PlannedSlot(
                    slot_type="place",
                    title=place.name,
                    location=place.category,
                    start_time=current.time(),
                    duration_minutes=stay,
                    description=place.description,
                    place_ref=place,
                )
            )
            current += timedelta(minutes=stay)

            # ─── 5. 시간 초과 방지 ───
            if current.time() >= time(22, 0):
                break

        # 일정 끝에 저녁이 안 들어갔으면 강제 추가
        current, slots, meal_added = _maybe_insert_meal(
            current, slots, meal_added, "근처", force_dinner=True
        )

        title = _make_day_title(ordered_places)
        caution = _make_caution(assignment.weather, disaster_alerts)

        return PlannedDay(
            day_number=day_number,
            target_date=assignment.target_date,
            title=title,
            weather=assignment.weather,
            disaster_alerts=disaster_alerts,
            slots=slots,
            caution=caution,
        )

    def _daily_start_time(self) -> time:
        return time(9, 0) if self.pace >= 70 else time(10, 0)


# ══════════════════════════════════════════════════════
# 헬퍼
# ══════════════════════════════════════════════════════
def _combine(d: date, t: time) -> datetime:
    return datetime.combine(d, t)


def _minutes_between(a: time, b: time) -> int:
    """a → b 분 차이. 음수면 0."""
    diff = (b.hour * 60 + b.minute) - (a.hour * 60 + a.minute)
    return max(0, diff)


def _make_move_slot(start_t: time, duration: int, dest_name: str) -> PlannedSlot:
    return PlannedSlot(
        slot_type="move",
        title=f"이동: {dest_name}",
        location="이동",
        start_time=start_t,
        duration_minutes=duration,
        move_duration_minutes=duration,
        description=f"카카오 길찾기 기준 약 {duration}분 소요됩니다.",
    )


def _maybe_insert_meal(
    current: datetime,
    slots: list[PlannedSlot],
    meal_added: dict[str, bool],
    nearby_label: str,
    force_dinner: bool = False,
) -> tuple[datetime, list[PlannedSlot], dict[str, bool]]:
    """현재 시각이 식사 시간대면 식사 슬롯 삽입."""
    t = current.time()

    if not meal_added["lunch"] and time(12, 0) <= t <= time(14, 0):
        slots.append(
            PlannedSlot(
                slot_type="meal",
                title="점심 식사",
                location=nearby_label,
                start_time=t,
                duration_minutes=60,
                description="근처 검증된 식당 또는 동행자 선호 메뉴.",
            )
        )
        meal_added["lunch"] = True
        current += timedelta(minutes=60)

    elif not meal_added["dinner"] and time(18, 0) <= t <= time(20, 0):
        # 정상 저녁 시간대
        slots.append(
            PlannedSlot(
                slot_type="meal",
                title="저녁 식사",
                location=nearby_label,
                start_time=t,
                duration_minutes=90,
                description="하루를 정리하는 식사. 인근 인기 식당 또는 숙소 근처.",
            )
        )
        meal_added["dinner"] = True
        current += timedelta(minutes=90)

    elif force_dinner and not meal_added["dinner"] and t >= time(17, 0):
        # 일정 마무리 단계에서 저녁이 누락된 경우만 강제 삽입.
        # 17시 이전이면 아직 저녁 시간이 아니므로 삽입하지 않음.
        slots.append(
            PlannedSlot(
                slot_type="meal",
                title="저녁 식사",
                location=nearby_label,
                start_time=t,
                duration_minutes=90,
                description="하루를 정리하는 식사. 인근 인기 식당 또는 숙소 근처.",
            )
        )
        meal_added["dinner"] = True
        current += timedelta(minutes=90)

    return current, slots, meal_added


def _make_day_title(places: list[PlannedPlace]) -> str:
    """LLM이 더 좋은 제목으로 교체할 수도 있는 임시 제목."""
    if not places:
        return "여유로운 하루"
    if len(places) == 1:
        return f"{places[0].name} 중심의 하루"
    return f"{places[0].name}와 {places[-1].name} 사이"


def _make_caution(
    weather: WeatherForecast, disasters: list[DisasterAlert]
) -> str:
    """날씨 + 재난 정보 합성."""
    parts: list[str] = []

    if weather.is_bad_weather:
        parts.append(
            f"날씨 주의: {weather.description}, 우산과 실내 대체 코스 준비 권장."
        )
    elif weather.is_high_uv:
        parts.append(
            f"자외선 지수 {weather.uv_index} (강함). 야외 활동 시 모자/선크림 권장."
        )

    outdoor_alerts = [d for d in disasters if d.affects_outdoor()]
    if outdoor_alerts:
        alert = outdoor_alerts[0]
        parts.append(f"안전 알림: {alert.title}. {alert.message[:60]}")

    if not parts:
        parts.append("이동 동선이 효율적으로 정리되어 있어 편한 신발만 챙기시면 좋습니다.")

    return " ".join(parts)
