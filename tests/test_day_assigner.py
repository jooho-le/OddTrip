"""DayAssigner 단위 테스트.

검증할 내용:
1. 적절한 일자별 분배 (장소 수가 균등한지)
2. 휴무일 회피
3. 빈 입력 처리
4. 일자 수가 장소 수보다 많은 경우
"""
from datetime import date, time, timedelta

import pytest

from backend.app.clients.kakao_client import Coordinate
from backend.app.clients.place_info_client import PlaceInfo
from backend.app.clients.weather_client import WeatherForecast
from backend.app.planner.day_assigner import DayAssigner
from backend.app.planner.models import PlannedPlace


def make_place(
    name: str,
    lat: float,
    lng: float,
    indoor: bool = False,
    famous: bool = False,
    closed_days: list[int] | None = None,
) -> PlannedPlace:
    """테스트용 PlannedPlace 생성기.

    closed_days: 휴무 요일 인덱스 리스트 (0=월, 6=일)
    """
    closed_days = closed_days or []
    opening_hours = [
        None if i in closed_days else (time(10, 0), time(18, 0))
        for i in range(7)
    ]
    return PlannedPlace(
        input_id=name,
        name=name,
        category="test",
        coord=Coordinate(lat=lat, lng=lng),
        info=PlaceInfo(opening_hours=opening_hours, indoor=indoor),
        famous=famous,
    )


def make_weather_dict(
    start: date, num_days: int, condition: str = "sunny"
) -> dict[date, WeatherForecast]:
    """모든 날짜에 동일한 날씨로 채운 dict."""
    result = {}
    for i in range(num_days):
        d = start + timedelta(days=i)
        result[d] = WeatherForecast(
            target_date=d,
            condition=condition,  # type: ignore
            temperature=20.0,
            precipitation_prob=10 if condition == "sunny" else 80,
            uv_index=5,
            description=condition,
        )
    return result


# ══════════════════════════════════════════════════════
# 기본 분배 검증
# ══════════════════════════════════════════════════════
def test_empty_places() -> None:
    """장소 0개면 빈 결과."""
    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=[],
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 3),
        weather_by_date={},
    )
    assert result == []


def test_three_places_three_days() -> None:
    """3개 장소 / 3일 → 각 일자에 1개씩."""
    places = [
        make_place("A", 37.50, 127.00),  # 멀리 떨어진 3곳
        make_place("B", 37.60, 127.10),
        make_place("C", 37.70, 127.20),
    ]
    start = date(2026, 6, 1)
    end = date(2026, 6, 3)

    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=places,
        start_date=start,
        end_date=end,
        weather_by_date=make_weather_dict(start, 3),
    )

    assert len(result) == 3
    # 각 일자에 적어도 1개 이상
    for r in result:
        assert len(r.places) >= 1
    # 전체 장소 수가 보존됨
    total = sum(len(r.places) for r in result)
    assert total == 3


def test_six_places_two_days() -> None:
    """6개 장소 / 2일 → 각 일자에 약 3개씩."""
    places = [
        # 강북 그룹
        make_place("강북_1", 37.58, 126.98),
        make_place("강북_2", 37.59, 126.99),
        make_place("강북_3", 37.57, 126.97),
        # 강남 그룹
        make_place("강남_1", 37.50, 127.05),
        make_place("강남_2", 37.51, 127.06),
        make_place("강남_3", 37.49, 127.04),
    ]
    start = date(2026, 6, 1)
    end = date(2026, 6, 2)

    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=places,
        start_date=start,
        end_date=end,
        weather_by_date=make_weather_dict(start, 2),
    )

    assert len(result) == 2
    # 각 일자에 3개씩 균등 분배 기대
    for r in result:
        assert 2 <= len(r.places) <= 4  # 약간의 편차 허용

    # 같은 지역끼리 묶였는지 (강북 그룹이 한 클러스터에)
    clusters = [set(p.name for p in r.places) for r in result]
    has_north_cluster = any(
        all("강북" in n for n in c) for c in clusters
    )
    has_south_cluster = any(
        all("강남" in n for n in c) for c in clusters
    )
    assert has_north_cluster, f"강북끼리 묶이지 않음: {clusters}"
    assert has_south_cluster, f"강남끼리 묶이지 않음: {clusters}"


# ══════════════════════════════════════════════════════
# 휴무일 회피
# ══════════════════════════════════════════════════════
def test_avoid_closed_day() -> None:
    """월요일 휴관인 박물관은 가능하면 다른 요일에 배정."""
    # 2026년 6월 1일은 월요일
    monday = date(2026, 6, 1)
    tuesday = date(2026, 6, 2)
    wednesday = date(2026, 6, 3)

    assert monday.weekday() == 0  # 월요일 확인

    # 박물관 1개 (월요일 휴관) + 산책 1개 (휴무 없음)
    places = [
        make_place("박물관", 37.58, 126.98, closed_days=[0]),  # 월요일 휴관
        make_place("산책로", 37.59, 126.99),  # 휴무 없음
    ]

    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=places,
        start_date=monday,
        end_date=wednesday,
        weather_by_date=make_weather_dict(monday, 3),
    )

    # 박물관이 월요일에 배정되지 않아야 함
    for r in result:
        if r.target_date == monday:
            place_names = [p.name for p in r.places]
            assert "박물관" not in place_names, (
                f"월요일에 박물관이 배정됨 (휴관일): {place_names}"
            )


# ══════════════════════════════════════════════════════
# 날씨 매칭
# ══════════════════════════════════════════════════════
def test_indoor_cluster_on_rainy_day() -> None:
    """비 오는 날이 있으면 실내 위주 클러스터가 그 날에 배정.

    이건 확률적 휴리스틱이라 100% 보장은 아니지만, 명확한 차이가 있는
    설정에서는 잘 동작해야 함.
    """
    # 실내 클러스터 vs 실외 클러스터
    places = [
        # 실내 그룹 (멀리 떨어진 위치)
        make_place("박물관A", 37.50, 127.00, indoor=True),
        make_place("박물관B", 37.51, 127.01, indoor=True),
        make_place("카페A", 37.52, 127.02, indoor=True),
        # 실외 그룹
        make_place("공원A", 37.70, 127.20, indoor=False),
        make_place("공원B", 37.71, 127.21, indoor=False),
        make_place("해변A", 37.72, 127.22, indoor=False),
    ]
    start = date(2026, 6, 1)
    rainy_day = start
    sunny_day = start + timedelta(days=1)

    # 첫째날 비, 둘째날 맑음
    weather = {
        rainy_day: WeatherForecast(
            target_date=rainy_day,
            condition="rain",
            temperature=18.0,
            precipitation_prob=80,
            uv_index=2,
            description="비",
        ),
        sunny_day: WeatherForecast(
            target_date=sunny_day,
            condition="sunny",
            temperature=22.0,
            precipitation_prob=10,
            uv_index=7,
            description="맑음",
        ),
    }

    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=places,
        start_date=start,
        end_date=sunny_day,
        weather_by_date=weather,
    )

    # 비 오는 날 (첫째날) 클러스터의 실내 비중이 더 높아야 함
    rainy_assignment = next(r for r in result if r.target_date == rainy_day)
    sunny_assignment = next(r for r in result if r.target_date == sunny_day)

    rainy_indoor_ratio = sum(
        1 for p in rainy_assignment.places if p.info.indoor
    ) / len(rainy_assignment.places)
    sunny_indoor_ratio = sum(
        1 for p in sunny_assignment.places if p.info.indoor
    ) / len(sunny_assignment.places)

    assert rainy_indoor_ratio >= sunny_indoor_ratio, (
        f"비 오는 날 실내 비중({rainy_indoor_ratio:.0%})이 "
        f"맑은 날({sunny_indoor_ratio:.0%})보다 낮음 - "
        f"날씨 매칭이 제대로 동작하지 않음"
    )


# ══════════════════════════════════════════════════════
# 일자 수 > 장소 수
# ══════════════════════════════════════════════════════
def test_more_days_than_places() -> None:
    """일자가 장소보다 많으면 각 장소가 하루씩."""
    places = [
        make_place("A", 37.50, 127.00),
        make_place("B", 37.60, 127.10),
    ]
    start = date(2026, 6, 1)
    end = date(2026, 6, 5)  # 5일

    assigner = DayAssigner(pace=50)
    result = assigner.assign(
        places=places,
        start_date=start,
        end_date=end,
        weather_by_date=make_weather_dict(start, 5),
    )

    # 2개의 클러스터만 만들어짐 (장소 수만큼)
    assert len(result) == 2
    for r in result:
        assert len(r.places) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
