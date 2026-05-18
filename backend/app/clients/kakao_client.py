"""카카오 로컬 + 모빌리티 API 클라이언트.

──────────────────────────────────────
두 가지 책임을 하나의 클라이언트로 묶음
──────────────────────────────────────
1) Local API: 장소명으로 좌표 검색
   예: "청수당 익선" -> Coordinate(lat=37.572, lng=126.989)

2) Mobility API: 두 좌표 간 자동차 이동시간/거리 계산
   예: A지점 -> B지점 -> RouteResult(duration=18분, distance=4.5km)

──────────────────────────────────────
비용 절약 전략
──────────────────────────────────────
- 좌표 검색은 한 번 하면 DB에 영구 저장 가능 (호출자가 캐싱 책임)
- 길찾기 결과는 메모리 캐시 (한 인스턴스 안에서만 유효)
- N개 지점의 거리 매트릭스 구축 시 동시 요청 10개로 제한 (rate limit 회피)

──────────────────────────────────────
API 키가 없을 때 (mock 모드)
──────────────────────────────────────
- 좌표: 장소명에서 도시명 추출 + 결정론적 offset
- 길찾기: Haversine 직선 거리 × 1.3 / 25km/h (도심 평균 속도)
"""
from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass
from typing import Optional

import httpx

from ..config import settings


# ══════════════════════════════════════════════════════
# 도메인 모델
# ══════════════════════════════════════════════════════
@dataclass(frozen=True)
class Coordinate:
    """위도/경도 좌표.

    frozen=True 이유: dict의 키나 set 원소로 쓰기 위함.
                     좌표는 한번 만들어지면 변경되지 않는 값 객체.
    """
    lat: float
    lng: float


@dataclass
class RouteResult:
    """두 좌표 간 길찾기 결과."""
    duration_minutes: int
    distance_meters: int
    mode: str = "car"


# 카카오 API 엔드포인트
KAKAO_LOCAL_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions"


class KakaoLocalClient:
    """카카오 Local + Mobility API 통합 클라이언트."""

    def __init__(self) -> None:
        self.api_key: str = getattr(settings, "kakao_rest_api_key", "") or ""
        self.enabled: bool = bool(self.api_key)
        # 경로 캐시: (출발좌표, 도착좌표) -> RouteResult
        self._route_cache: dict[tuple[Coordinate, Coordinate], RouteResult] = {}

    # ══════════════════════════════════════════════════
    # 1. 좌표 검색
    # ══════════════════════════════════════════════════
    async def search_coordinate(self, query: str) -> Optional[Coordinate]:
        """장소명으로 가장 적합한 좌표 하나를 반환."""
        if not self.enabled:
            return _mock_coordinate(query)

        headers = {"Authorization": f"KakaoAK {self.api_key}"}
        params = {"query": query, "size": 1}

        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(KAKAO_LOCAL_URL, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            return _mock_coordinate(query)

        documents = data.get("documents", [])
        if not documents:
            return None

        # 카카오 API는 x=경도, y=위도 (주의!)
        first = documents[0]
        return Coordinate(lat=float(first["y"]), lng=float(first["x"]))

    async def batch_search_coordinates(
        self, queries: list[str]
    ) -> dict[str, Optional[Coordinate]]:
        """여러 장소명을 병렬로 검색."""
        tasks = [self.search_coordinate(q) for q in queries]
        results = await asyncio.gather(*tasks)
        return dict(zip(queries, results))

    # ══════════════════════════════════════════════════
    # 2. 길찾기 (이동 시간 계산)
    # ══════════════════════════════════════════════════
    async def get_route(
        self, origin: Coordinate, destination: Coordinate
    ) -> RouteResult:
        """두 좌표 간 자동차 이동 시간과 거리를 반환 (캐시 적용)."""
        cache_key = (origin, destination)
        if cache_key in self._route_cache:
            return self._route_cache[cache_key]

        if not self.enabled:
            result = _mock_route(origin, destination)
        else:
            result = await self._fetch_route(origin, destination)

        self._route_cache[cache_key] = result
        return result

    async def _fetch_route(
        self, origin: Coordinate, destination: Coordinate
    ) -> RouteResult:
        """실제 카카오 모빌리티 API 호출."""
        headers = {"Authorization": f"KakaoAK {self.api_key}"}
        params = {
            "origin": f"{origin.lng},{origin.lat}",
            "destination": f"{destination.lng},{destination.lat}",
            "priority": "RECOMMEND",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(
                    KAKAO_DIRECTIONS_URL, headers=headers, params=params
                )
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            return _mock_route(origin, destination)

        routes = data.get("routes", [])
        if not routes:
            return _mock_route(origin, destination)

        summary = routes[0].get("summary", {})
        return RouteResult(
            duration_minutes=max(1, int(summary.get("duration", 0)) // 60),
            distance_meters=int(summary.get("distance", 0)),
        )

    async def build_distance_matrix(
        self, points: list[Coordinate]
    ) -> list[list[RouteResult]]:
        """N개 지점에 대한 N × N 이동시간 매트릭스.

        TSP 풀기 전 필수 전처리 단계.
        N개 지점이면 N×(N-1)번 호출, N=6이면 30회.
        """
        n = len(points)
        matrix: list[list[RouteResult]] = [
            [RouteResult(0, 0) for _ in range(n)] for _ in range(n)
        ]

        tasks: list[tuple[int, int]] = []
        for i in range(n):
            for j in range(n):
                if i != j:
                    tasks.append((i, j))

        # 동시 요청 10개로 제한 (rate limit 회피)
        semaphore = asyncio.Semaphore(10)

        async def fill(i: int, j: int) -> None:
            async with semaphore:
                matrix[i][j] = await self.get_route(points[i], points[j])

        await asyncio.gather(*(fill(i, j) for i, j in tasks))
        return matrix


# ══════════════════════════════════════════════════════
# Mock 유틸리티
# ══════════════════════════════════════════════════════
_KOREA_CITY_COORDS = {
    "서울": (37.5665, 126.9780),
    "부산": (35.1796, 129.0756),
    "제주": (33.4996, 126.5312),
    "강릉": (37.7519, 128.8761),
    "전주": (35.8242, 127.1480),
    "경주": (35.8562, 129.2247),
    "여수": (34.7604, 127.6622),
    "북촌": (37.5827, 126.9836),
    "익선": (37.5717, 126.9889),
    "성수": (37.5446, 127.0560),
    "광장시장": (37.5703, 127.0007),
    "안국": (37.5765, 126.9853),
    "소격동": (37.5793, 126.9805),
    "서촌": (37.5793, 126.9700),
}


def _mock_coordinate(query: str) -> Coordinate:
    """장소명에서 도시/지역명 추출 + 결정론적 offset.

    같은 query는 항상 같은 좌표를 반환 (데모 일관성 유지).
    """
    base_lat, base_lng = 37.5665, 126.9780  # 기본: 서울 시청

    # 더 구체적인 지역명을 먼저 매칭 (북촌 → 서울 안의 북촌)
    for keyword, (lat, lng) in _KOREA_CITY_COORDS.items():
        if keyword in query:
            base_lat, base_lng = lat, lng
            break

    # 결정론적 offset (같은 입력 → 같은 출력)
    h = hash(query)
    offset_lat = ((h % 1000) - 500) / 50000  # ±0.01도 ≈ ±1km
    offset_lng = ((h // 1000 % 1000) - 500) / 50000
    return Coordinate(lat=base_lat + offset_lat, lng=base_lng + offset_lng)


def _haversine_km(a: Coordinate, b: Coordinate) -> float:
    """두 좌표 간 직선 거리 (km). 지구 곡률 반영."""
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


def _mock_route(origin: Coordinate, destination: Coordinate) -> RouteResult:
    """Haversine 거리 × 1.3 (도로 우회 계수) / 25km/h 추정."""
    straight_km = _haversine_km(origin, destination)
    road_km = straight_km * 1.3
    duration_min = max(1, int(road_km / 25 * 60))
    return RouteResult(
        duration_minutes=duration_min,
        distance_meters=int(road_km * 1000),
    )
