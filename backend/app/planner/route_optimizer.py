"""동선 최적화 모듈 — Held-Karp TSP 동적 계획법.

╔══════════════════════════════════════════════════════════╗
║  ⭐ 이 파일은 일정 생성기의 알고리즘적 핵심입니다.       ║
╚══════════════════════════════════════════════════════════╝

──────────────────────────────────────
풀고 있는 문제: TSP
──────────────────────────────────────
"하루 동안 방문할 N개 장소가 있다. 어떤 순서로 가야 총 이동시간이 최소인가?"

NP-hard 문제. 모든 순열 확인은 N=10에서 360만 가지로 한계.

──────────────────────────────────────
Held-Karp 동적 계획법 (1962)
──────────────────────────────────────
시간 복잡도: O(N² · 2^N)
  N=8: 16,384 연산 → ~50ms
  N=10: 100,000 연산 → ~200ms

핵심: 비트마스크로 부분집합 표현.

상태:
    dp[mask][i] = "시작점에서 출발해 mask에 포함된 모든 도시를 거쳐
                   마지막에 도시 i에 도착하는 최소 비용"

점화식:
    dp[mask][i] = min over j in (mask \\ {i}):
                      dp[mask \\ {i}][j] + dist(j, i)
"""
from __future__ import annotations

from dataclasses import dataclass

from ..clients.kakao_client import KakaoLocalClient, RouteResult
from .models import PlannedPlace


@dataclass
class OptimizedRoute:
    """최적화된 동선 결과."""
    order: list[int]                  # 원본 places 인덱스 순서
    total_duration_minutes: int       # 총 이동 시간
    leg_durations: list[int]          # 각 구간 이동 시간
    leg_distances_m: list[int]        # 각 구간 이동 거리


class RouteOptimizer:
    """동선 최적화기."""

    EXACT_SOLVE_THRESHOLD = 9

    def __init__(self, kakao: KakaoLocalClient) -> None:
        self.kakao = kakao

    async def optimize(
        self,
        places: list[PlannedPlace],
        fixed_start: bool = False,
    ) -> OptimizedRoute:
        """동선 최적화.

        Args:
            places: 방문할 장소 리스트
            fixed_start: True면 places[0]을 시작점으로 고정
        """
        n = len(places)
        if n == 0:
            return OptimizedRoute(
                order=[], total_duration_minutes=0,
                leg_durations=[], leg_distances_m=[],
            )
        if n == 1:
            return OptimizedRoute(
                order=[0], total_duration_minutes=0,
                leg_durations=[], leg_distances_m=[],
            )

        # 1. 거리 매트릭스 구축
        matrix = await self.kakao.build_distance_matrix(
            [p.coord for p in places]
        )

        # 2. 알고리즘 분기
        if n <= self.EXACT_SOLVE_THRESHOLD:
            order = _held_karp(matrix, fixed_start)
        else:
            order = _nearest_neighbor_then_2opt(matrix, fixed_start)

        # 3. 결과 패키징
        return _build_result(order, matrix)


# ══════════════════════════════════════════════════════
# 정확해: Held-Karp 동적 계획법
# ══════════════════════════════════════════════════════
def _held_karp(
    matrix: list[list[RouteResult]], fixed_start: bool
) -> list[int]:
    """Held-Karp DP로 최적 순서 계산."""
    n = len(matrix)
    if fixed_start:
        return _held_karp_from(matrix, start=0)

    # 모든 시작점 후보 시도
    best_order: list[int] = list(range(n))
    best_cost = float("inf")

    for start in range(n):
        order = _held_karp_from(matrix, start=start)
        cost = _total_cost(order, matrix)
        if cost < best_cost:
            best_cost = cost
            best_order = order

    return best_order


def _held_karp_from(matrix: list[list[RouteResult]], start: int) -> list[int]:
    """시작점이 고정된 Held-Karp.

    DP 테이블:
        dp[(mask, last)] = 시작점에서 mask 도시들을 방문하고 last에서 끝나는 최소 비용
        parent[(mask, last)] = 그 경로에서 last 직전 도시 (경로 복원용)
    """
    n = len(matrix)
    INF = float("inf")

    dp: dict[tuple[int, int], float] = {}
    parent: dict[tuple[int, int], int] = {}

    # ─── 기저: 시작점만 방문한 상태 ───
    start_mask = 1 << start
    dp[(start_mask, start)] = 0.0

    # ─── 점화식 적용 ───
    # 비트 개수가 작은 mask부터 큰 mask로 처리
    for subset_size in range(1, n + 1):
        for mask in _masks_of_size(n, subset_size):
            if not (mask & start_mask):
                continue

            for last in range(n):
                if not (mask & (1 << last)):
                    continue
                if last == start and mask != start_mask:
                    continue
                key = (mask, last)
                if key not in dp:
                    continue
                base_cost = dp[key]

                # last에서 nxt로 확장
                for nxt in range(n):
                    if mask & (1 << nxt):
                        continue
                    new_mask = mask | (1 << nxt)
                    new_cost = base_cost + matrix[last][nxt].duration_minutes
                    new_key = (new_mask, nxt)
                    if new_cost < dp.get(new_key, INF):
                        dp[new_key] = new_cost
                        parent[new_key] = last

    # ─── 최종: 모든 도시 방문 후 임의 도시에서 끝 ───
    full_mask = (1 << n) - 1
    best_last = start
    best_cost = INF
    for last in range(n):
        if last == start and n > 1:
            continue
        cost = dp.get((full_mask, last), INF)
        if cost < best_cost:
            best_cost = cost
            best_last = last

    # ─── 경로 복원 ───
    order: list[int] = []
    mask = full_mask
    current = best_last
    while current != start:
        order.append(current)
        prev = parent.get((mask, current))
        if prev is None:
            break
        mask &= ~(1 << current)
        current = prev
    order.append(start)
    order.reverse()
    return order


def _masks_of_size(n: int, size: int):
    """n비트 중 정확히 size개 비트가 켜진 모든 마스크 생성."""
    if size == 0:
        yield 0
        return
    for mask in range(1 << n):
        if bin(mask).count("1") == size:
            yield mask


# ══════════════════════════════════════════════════════
# 휴리스틱: Nearest Neighbor + 2-opt (N > 9)
# ══════════════════════════════════════════════════════
def _nearest_neighbor_then_2opt(
    matrix: list[list[RouteResult]], fixed_start: bool
) -> list[int]:
    """N이 큰 경우의 휴리스틱."""
    n = len(matrix)

    def cost_of(order: list[int]) -> int:
        return sum(
            matrix[order[i]][order[i + 1]].duration_minutes
            for i in range(len(order) - 1)
        )

    # Nearest Neighbor 초기해
    best_order: list[int] = []
    start_candidates = [0] if fixed_start else range(n)
    best_cost = float("inf")

    for start in start_candidates:
        visited = {start}
        order = [start]
        current = start
        while len(order) < n:
            next_idx = min(
                (i for i in range(n) if i not in visited),
                key=lambda i: matrix[current][i].duration_minutes,
            )
            order.append(next_idx)
            visited.add(next_idx)
            current = next_idx
        c = cost_of(order)
        if c < best_cost:
            best_cost = c
            best_order = order

    # 2-opt 개선
    improved = True
    while improved:
        improved = False
        for i in range(1, len(best_order) - 2):
            for j in range(i + 1, len(best_order)):
                new_order = (
                    best_order[:i]
                    + best_order[i:j + 1][::-1]
                    + best_order[j + 1:]
                )
                new_cost = cost_of(new_order)
                if new_cost < best_cost:
                    best_order = new_order
                    best_cost = new_cost
                    improved = True
                    break
            if improved:
                break

    return best_order


def _total_cost(order: list[int], matrix: list[list[RouteResult]]) -> int:
    return sum(
        matrix[order[i]][order[i + 1]].duration_minutes
        for i in range(len(order) - 1)
    )


def _build_result(
    order: list[int], matrix: list[list[RouteResult]]
) -> OptimizedRoute:
    leg_durations: list[int] = []
    leg_distances: list[int] = []
    total = 0
    for i in range(len(order) - 1):
        r = matrix[order[i]][order[i + 1]]
        leg_durations.append(r.duration_minutes)
        leg_distances.append(r.distance_meters)
        total += r.duration_minutes

    return OptimizedRoute(
        order=order,
        total_duration_minutes=total,
        leg_durations=leg_durations,
        leg_distances_m=leg_distances,
    )
