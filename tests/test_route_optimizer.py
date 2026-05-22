"""RouteOptimizer (TSP) 단위 테스트.

테스트 시나리오:
1. N=1, 2 같은 엣지 케이스
2. N=4: Held-Karp 정확해 검증
3. N=10: 휴리스틱 동작 확인
4. 시작점 고정 vs 자유 옵션 검증
"""
import asyncio

import pytest

from backend.app.clients.google_maps_client import GoogleMapsClient, Coordinate
from backend.app.clients.place_info_client import PlaceInfo
from backend.app.planner.models import PlannedPlace
from backend.app.planner.route_optimizer import RouteOptimizer, _held_karp, _total_cost


# ══════════════════════════════════════════════════════
# Helper: 가짜 PlannedPlace 만들기
# ══════════════════════════════════════════════════════
def make_place(name: str, lat: float, lng: float) -> PlannedPlace:
    return PlannedPlace(
        input_id=name,
        name=name,
        category="test",
        coord=Coordinate(lat=lat, lng=lng),
        info=PlaceInfo(),
    )


# ══════════════════════════════════════════════════════
# 엣지 케이스
# ══════════════════════════════════════════════════════
def test_empty_input() -> None:
    """장소 0개면 빈 결과."""
    optimizer = RouteOptimizer(GoogleMapsClient())
    result = asyncio.run(optimizer.optimize([]))
    assert result.order == []
    assert result.total_duration_minutes == 0


def test_single_place() -> None:
    """장소 1개면 자기 자신만."""
    places = [make_place("A", 37.5, 127.0)]
    optimizer = RouteOptimizer(GoogleMapsClient())
    result = asyncio.run(optimizer.optimize(places))
    assert result.order == [0]
    assert result.total_duration_minutes == 0
    assert result.leg_durations == []


# ══════════════════════════════════════════════════════
# Held-Karp 정확해 검증
# ══════════════════════════════════════════════════════
def test_held_karp_4_cities_optimal() -> None:
    """4개 도시에 대해 Held-Karp 결과가 brute force 결과와 같아야 함.

    Brute force: 모든 순열 (4! = 24개)을 다 확인하고 최소 비용 찾기.
    """
    from itertools import permutations
    from backend.app.clients.google_maps_client import RouteResult

    # 임의의 4x4 비용 매트릭스
    costs = [
        [0, 10, 15, 20],
        [10, 0, 35, 25],
        [15, 35, 0, 30],
        [20, 25, 30, 0],
    ]
    matrix = [
        [RouteResult(duration_minutes=c, distance_meters=c * 100) for c in row]
        for row in costs
    ]

    # Brute force로 최적해 구하기
    n = len(matrix)
    brute_best_cost = float("inf")
    brute_best_order = None
    for perm in permutations(range(n)):
        cost = _total_cost(list(perm), matrix)
        if cost < brute_best_cost:
            brute_best_cost = cost
            brute_best_order = list(perm)

    # Held-Karp로 구하기
    hk_order = _held_karp(matrix, fixed_start=False)
    hk_cost = _total_cost(hk_order, matrix)

    # 비용이 같아야 함 (순서는 다를 수 있음 - 시작점 다른 경우)
    assert hk_cost == brute_best_cost, (
        f"Held-Karp cost {hk_cost} != brute force {brute_best_cost}\n"
        f"HK order: {hk_order}\nBrute: {brute_best_order}"
    )


def test_held_karp_5_cities_grid() -> None:
    """5개 도시가 일직선 격자에 있을 때, 한쪽 끝에서 다른 끝으로 가는 순서가 최적."""
    # 도시들이 (0,0), (1,0), (2,0), (3,0), (4,0)에 있음
    # 직선상에 있으므로 최적해는 일직선으로 통과 (또는 역순)
    places = [make_place(f"P{i}", 37.5, 127.0 + i * 0.1) for i in range(5)]

    optimizer = RouteOptimizer(GoogleMapsClient())
    result = asyncio.run(optimizer.optimize(places))

    # 시작점에서 끝점까지 일직선이거나 역순이어야 함
    # order는 [0,1,2,3,4] 또는 [4,3,2,1,0]
    assert result.order in (
        [0, 1, 2, 3, 4],
        [4, 3, 2, 1, 0],
    ), f"Expected linear order, got {result.order}"


def test_fixed_start_constraint() -> None:
    """fixed_start=True면 첫 장소가 0번이어야 함."""
    places = [
        make_place("A", 37.5, 127.0),
        make_place("B", 37.6, 127.1),
        make_place("C", 37.7, 127.2),
        make_place("D", 37.8, 127.3),
    ]
    optimizer = RouteOptimizer(GoogleMapsClient())
    result = asyncio.run(optimizer.optimize(places, fixed_start=True))
    assert result.order[0] == 0, f"Expected order to start with 0, got {result.order}"


# ══════════════════════════════════════════════════════
# 휴리스틱 (N > 9) 동작 확인
# ══════════════════════════════════════════════════════
def test_heuristic_10_cities() -> None:
    """10개 도시면 휴리스틱 모드로 동작."""
    places = [
        make_place(f"P{i}", 37.5 + (i % 3) * 0.1, 127.0 + (i // 3) * 0.1)
        for i in range(10)
    ]
    optimizer = RouteOptimizer(GoogleMapsClient())
    result = asyncio.run(optimizer.optimize(places))

    # 모든 장소가 정확히 한 번씩 방문되어야 함
    assert sorted(result.order) == list(range(10))
    # 총 비용이 양수
    assert result.total_duration_minutes > 0


# ══════════════════════════════════════════════════════
# 결정론적 동작 확인 (mock 모드)
# ══════════════════════════════════════════════════════
def test_deterministic_with_mock() -> None:
    """Mock 모드에서 같은 입력은 같은 결과를 내야 함."""
    places = [
        make_place(f"P{i}", 37.5 + i * 0.05, 127.0 + i * 0.05)
        for i in range(5)
    ]
    optimizer = RouteOptimizer(GoogleMapsClient())

    result1 = asyncio.run(optimizer.optimize(places))
    result2 = asyncio.run(optimizer.optimize(places))

    assert result1.order == result2.order
    assert result1.total_duration_minutes == result2.total_duration_minutes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
