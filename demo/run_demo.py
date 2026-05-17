"""OddTrip 일정 생성 + 동선 최적화 데모.

──────────────────────────────────────
실행 방법
──────────────────────────────────────
    # 1. 의존성 설치 (최초 1회)
    pip install -r demo/requirements.txt

    # 2. .env 파일 만들기 (demo/.env.example 복사 후 키 입력)
    cp demo/.env.example demo/.env
    # 그 다음 OPENAI_API_KEY 채우기

    # 3. 실행
    python demo/run_demo.py
    python demo/run_demo.py busan      # 부산 시나리오
    python demo/run_demo.py jeju       # 제주 시나리오

──────────────────────────────────────
검증할 점
──────────────────────────────────────
1. 시간 흐름이 자연스러운가? (영업시간 안에 있는가)
2. 식사 슬롯이 적절히 들어갔는가? (점심/저녁)
3. 이동 시간이 합리적인가?
4. 일자별 분배가 균등한가?
5. 비 오는 날 실내 위주로 배치되었는가? (운 좋게 비 나오면)
6. aiReason이 자연스러운 한국어인가? (OpenAI 키 있을 때)
"""
from __future__ import annotations

import asyncio
import sys
import time
from datetime import date, timedelta
from pathlib import Path

# src 모듈을 import할 수 있게 경로 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.planner import ItineraryPlanner, PlanRequest, PlannedDay
from demo.sample_data import SAMPLES


def print_separator(char: str = "=", length: int = 70) -> None:
    print(char * length)


def print_header(text: str) -> None:
    print_separator()
    print(f"  {text}")
    print_separator()


def print_input_summary(scenario_name: str, places, start: date, end: date, pace: int) -> None:
    """입력 정보 출력."""
    print()
    print_header(f"📍 입력 정보 - {scenario_name} 여행")
    print(f"  여행 기간: {start} ~ {end} ({(end - start).days + 1}일)")
    print(f"  일정 강도(pace): {pace}/100")
    print(f"  관광지/축제/숙소 ({len(places)}개):")
    for p in places:
        markers = []
        if p.famous: markers.append("⭐유명")
        if p.active: markers.append("🏃활동")
        marker_str = f" [{', '.join(markers)}]" if markers else ""
        print(f"    - {p.name} ({p.category}){marker_str}")
    print()


def print_planned_days(days: list[PlannedDay]) -> None:
    """생성된 일정 출력."""
    print_header("🗓  생성된 일정")

    if not days:
        print("  ❌ 생성된 일정이 없습니다.")
        return

    for day in days:
        print()
        # 일자 헤더
        weekday_kr = ["월", "화", "수", "목", "금", "토", "일"][day.target_date.weekday()]
        print(f"  📅 {day.day_number}일차 — {day.target_date} ({weekday_kr})")
        print(f"     날씨: {day.weather.description}")
        if day.weather.is_high_uv:
            print(f"     ⚠️  자외선 지수: {day.weather.uv_index} (강함)")
        if day.disaster_alerts:
            for alert in day.disaster_alerts:
                print(f"     ⚠️  재난 알림: {alert.title}")
        print(f"     주의사항: {day.caution}")
        print(f"     제목: 「{day.title}」")
        print()

        # 슬롯들
        for slot in day.slots:
            icon = {
                "place": "📍",
                "move": "🚗",
                "meal": "🍽 ",
                "rest": "💤",
            }.get(slot.slot_type, "❓")

            end_h, end_m = divmod(
                slot.start_time.hour * 60 + slot.start_time.minute + slot.duration_minutes,
                60,
            )
            end_str = f"{min(end_h, 23):02d}:{end_m:02d}"
            start_str = f"{slot.start_time.hour:02d}:{slot.start_time.minute:02d}"

            line1 = (
                f"     {icon} {start_str}-{end_str} ({slot.duration_minutes:3d}분) "
                f"{slot.title}"
            )
            if slot.location and slot.location != "이동":
                line1 += f"  ┃ {slot.location}"
            print(line1)

            if slot.ai_reason:
                print(f"        └─ 💡 {slot.ai_reason}")
        print()


def print_stats(days: list[PlannedDay], elapsed: float) -> None:
    """통계 출력."""
    print_header("📊 생성 통계")

    total_slots = sum(len(d.slots) for d in days)
    total_places = sum(
        sum(1 for s in d.slots if s.slot_type == "place")
        for d in days
    )
    total_moves = sum(
        sum(1 for s in d.slots if s.slot_type == "move")
        for d in days
    )
    total_move_min = sum(
        s.duration_minutes
        for d in days
        for s in d.slots
        if s.slot_type == "move"
    )

    print(f"  총 일수: {len(days)}일")
    print(f"  총 슬롯 수: {total_slots}개")
    print(f"  - 방문 장소: {total_places}개")
    print(f"  - 이동 구간: {total_moves}개")
    print(f"  총 이동 시간: {total_move_min}분 (약 {total_move_min // 60}시간 {total_move_min % 60}분)")
    print(f"  생성 소요 시간: {elapsed:.2f}초")
    print()


async def run(scenario: str = "seoul") -> None:
    """데모 실행."""
    if scenario not in SAMPLES:
        print(f"❌ 알 수 없는 시나리오: {scenario}")
        print(f"   사용 가능: {', '.join(SAMPLES.keys())}")
        return

    city_name, places, region = SAMPLES[scenario]

    # 여행 날짜: 2주 뒤부터
    start = date.today() + timedelta(days=14)
    end = start + timedelta(days=2 if scenario != "busan" else 1)
    pace = 55

    print_input_summary(city_name, places, start, end, pace)

    # 일정 생성 실행 + 시간 측정
    print_header("⚙️  일정 생성 중...")
    print()

    planner = ItineraryPlanner.create_default()

    t0 = time.perf_counter()
    days = await planner.plan(PlanRequest(
        places=places,
        start_date=start,
        end_date=end,
        base_region=region,
        pace=pace,
        traveler_context=f"{city_name} 여행을 함께하는 두 친구",
    ))
    elapsed = time.perf_counter() - t0

    print_planned_days(days)
    print_stats(days, elapsed)


def main() -> None:
    scenario = sys.argv[1] if len(sys.argv) > 1 else "seoul"
    asyncio.run(run(scenario))


if __name__ == "__main__":
    main()
