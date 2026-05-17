"""일자별 장소 분배.

──────────────────────────────────────
문제
──────────────────────────────────────
"장소 10개를 3일에 어떻게 나눠야 효율적인가?"

──────────────────────────────────────
전략: 그리디 클러스터링
──────────────────────────────────────
K-means++의 시드 선택 아이디어를 차용:
1) 첫 시드: famous=True인 장소
2) 다음 시드: 기존 시드들로부터 최소 거리가 최대인 장소
3) 각 장소를 가장 가까운 시드 클러스터에 추가 (크기 페널티 적용)
4) 각 클러스터를 적합한 날짜에 배정 (날씨/휴무 매칭)
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, timedelta

from ..clients.kakao_client import Coordinate
from ..clients.weather_client import WeatherForecast
from .models import PlannedPlace


@dataclass
class AssignmentResult:
    """하루치 배정 결과."""
    target_date: date
    weekday: int
    weather: WeatherForecast
    places: list[PlannedPlace]


class DayAssigner:
    """N일 여행에 대한 일자별 장소 분배기."""

    def __init__(self, pace: int = 50) -> None:
        """
        Args:
            pace: 0~100. 높을수록 하루에 더 많이 넣음.
                  30 -> 3곳, 50 -> 4곳, 80 -> 5곳.
        """
        self.pace = pace

    def assign(
        self,
        places: list[PlannedPlace],
        start_date: date,
        end_date: date,
        weather_by_date: dict[date, WeatherForecast],
    ) -> list[AssignmentResult]:
        """장소를 일자별로 분배."""
        num_days = (end_date - start_date).days + 1
        if num_days <= 0 or not places:
            return []

        places_per_day = self._target_count_per_day()

        # 그리디 클러스터링
        clusters = _greedy_cluster(places, num_days, places_per_day)

        # 각 클러스터를 점수가 가장 높은 날짜에 매칭
        results: list[AssignmentResult] = []
        used_dates: set[date] = set()

        for cluster in clusters:
            best_date = self._pick_best_date(
                cluster, start_date, end_date, weather_by_date, used_dates
            )
            used_dates.add(best_date)
            weather = weather_by_date.get(
                best_date, _default_weather(best_date)
            )
            results.append(
                AssignmentResult(
                    target_date=best_date,
                    weekday=best_date.weekday(),
                    weather=weather,
                    places=cluster,
                )
            )

        results.sort(key=lambda r: r.target_date)
        return results

    def _target_count_per_day(self) -> int:
        """pace -> 하루 적정 장소 개수."""
        if self.pace >= 75:
            return 5
        if self.pace >= 45:
            return 4
        return 3

    def _pick_best_date(
        self,
        cluster: list[PlannedPlace],
        start_date: date,
        end_date: date,
        weather_by_date: dict[date, WeatherForecast],
        used_dates: set[date],
    ) -> date:
        """클러스터에 가장 적합한 날짜를 점수화해 선택.

        점수:
        +10 클러스터의 모든 장소가 그 요일에 영업
        -5  하나라도 휴무
        +3  실내 비중 60%+ 클러스터인데 비 오는 날 (안성맞춤)
        -3  실외 비중 70%+ 클러스터인데 비 오는 날 (회피)
        """
        candidates = [
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
            if (start_date + timedelta(days=i)) not in used_dates
        ]
        if not candidates:
            return start_date

        indoor_ratio = sum(1 for p in cluster if p.info.indoor) / len(cluster)

        def score(d: date) -> int:
            weekday = d.weekday()
            closed_count = sum(
                1 for p in cluster if p.info.is_closed_on(weekday)
            )
            s = -5 * closed_count + 10 * (len(cluster) - closed_count)

            w = weather_by_date.get(d)
            if w and w.is_bad_weather:
                if indoor_ratio >= 0.6:
                    s += 3
                elif indoor_ratio <= 0.3:
                    s -= 3
            return s

        return max(candidates, key=score)


# ══════════════════════════════════════════════════════
# 그리디 클러스터링
# ══════════════════════════════════════════════════════
def _greedy_cluster(
    places: list[PlannedPlace], num_clusters: int, target_size: int
) -> list[list[PlannedPlace]]:
    """공간적으로 가까운 장소끼리 묶기."""
    if not places:
        return []
    if num_clusters >= len(places):
        return [[p] for p in places]

    # ─── 시드 선택 ───
    seeds: list[PlannedPlace] = []

    # 첫 시드: famous 우선
    famous_first = sorted(places, key=lambda p: not p.famous)
    seeds.append(famous_first[0])

    # 나머지 시드: 기존 시드들과 가장 먼 장소
    while len(seeds) < num_clusters:
        def min_dist_to_seeds(p: PlannedPlace) -> float:
            return min(_haversine(p.coord, s.coord) for s in seeds)

        candidates = [p for p in places if p not in seeds]
        if not candidates:
            break
        seeds.append(max(candidates, key=min_dist_to_seeds))

    # ─── 할당 ───
    clusters: list[list[PlannedPlace]] = [[s] for s in seeds]
    remaining = [p for p in places if p not in seeds]

    # 클러스터 최대 크기: 평균 + 1 (균형 유지)
    # 예: 5장소 / 2일이면 평균 2.5 → 최대 3
    max_cluster_size = (len(places) + len(seeds) - 1) // len(seeds) + 1

    for p in sorted(remaining, key=lambda x: -1 if x.famous else 0):
        def cost(idx: int) -> float:
            seed_dist = _haversine(p.coord, seeds[idx].coord)
            # 크기 페널티를 거리 단위(km)로 환산해 강하게 적용.
            # target_size 초과 시 km 단위로 큰 페널티 (10km 정도 = 도시 끝-끝)
            size_excess = max(0, len(clusters[idx]) - target_size + 1)
            size_penalty = size_excess * 10.0
            return seed_dist + size_penalty

        # 상한 도달한 클러스터는 후보에서 제외
        # (모두 상한 도달했으면 어쩔 수 없이 가장 작은 곳에 추가)
        available = [
            idx for idx in range(len(clusters))
            if len(clusters[idx]) < max_cluster_size
        ]
        if not available:
            # 모든 클러스터가 max에 도달 → 가장 작은 클러스터로
            best_idx = min(range(len(clusters)), key=lambda i: len(clusters[i]))
        else:
            best_idx = min(available, key=cost)
        clusters[best_idx].append(p)

    return clusters


def _haversine(a: Coordinate, b: Coordinate) -> float:
    """두 좌표 간 직선 거리 (km)."""
    R = 6371.0
    phi_1 = math.radians(a.lat)
    phi_2 = math.radians(b.lat)
    d_phi = math.radians(b.lat - a.lat)
    d_lambda = math.radians(b.lng - a.lng)
    h = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi_1) * math.cos(phi_2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(h))


def _default_weather(d: date) -> WeatherForecast:
    return WeatherForecast(
        target_date=d,
        condition="sunny",
        temperature=20.0,
        precipitation_prob=10,
        uv_index=5,
        description="맑음, 기본값",
    )
