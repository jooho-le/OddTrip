"""Google Maps API client for geocoding and travel-time estimates.

The planner keeps working without a Google key by using deterministic local
fallbacks. That keeps demos usable while allowing real coordinates and route
times when GOOGLE_MAPS_API_KEY is configured.
"""
from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass
from typing import Optional

import httpx

from ..config import settings


@dataclass(frozen=True)
class Coordinate:
    lat: float
    lng: float


@dataclass
class RouteResult:
    duration_minutes: int
    distance_meters: int
    mode: str = "car"
    source: str = "google"


GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
GOOGLE_DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


class GoogleMapsClient:
    """Google Geocoding + Distance Matrix client."""

    def __init__(self) -> None:
        self.api_key: str = getattr(settings, "google_maps_api_key", "") or ""
        self.enabled: bool = bool(self.api_key)
        self._route_cache: dict[tuple[Coordinate, Coordinate], RouteResult] = {}

    async def search_coordinate(self, query: str) -> Optional[Coordinate]:
        if not self.enabled:
            return _mock_coordinate(query)

        params = {
            "address": query,
            "region": "kr",
            "language": "ko",
            "key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as http:
                resp = await http.get(GOOGLE_GEOCODE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            return _mock_coordinate(query)

        if data.get("status") != "OK" or not data.get("results"):
            return _mock_coordinate(query)

        location = data["results"][0]["geometry"]["location"]
        return Coordinate(lat=float(location["lat"]), lng=float(location["lng"]))

    async def batch_search_coordinates(
        self, queries: list[str]
    ) -> dict[str, Optional[Coordinate]]:
        tasks = [self.search_coordinate(q) for q in queries]
        results = await asyncio.gather(*tasks)
        return dict(zip(queries, results))

    async def get_route(
        self, origin: Coordinate, destination: Coordinate
    ) -> RouteResult:
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
        params = {
            "origins": f"{origin.lat},{origin.lng}",
            "destinations": f"{destination.lat},{destination.lng}",
            "mode": "driving",
            "language": "ko",
            "key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as http:
                resp = await http.get(GOOGLE_DISTANCE_MATRIX_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            print(f"[GoogleMapsClient] Distance Matrix fallback: request failed ({exc})")
            return _mock_route(origin, destination)

        rows = data.get("rows", [])
        element = rows[0].get("elements", [None])[0] if rows else None
        if data.get("status") != "OK" or not element or element.get("status") != "OK":
            status = data.get("status")
            error_message = data.get("error_message", "")
            element_status = element.get("status") if element else None
            print(
                "[GoogleMapsClient] Distance Matrix fallback: "
                f"status={status}, element_status={element_status}, error={error_message}"
            )
            return _mock_route(origin, destination)

        return RouteResult(
            duration_minutes=max(1, int(element["duration"]["value"]) // 60),
            distance_meters=int(element["distance"]["value"]),
            source="google",
        )

    async def build_distance_matrix(
        self, points: list[Coordinate]
    ) -> list[list[RouteResult]]:
        n = len(points)
        matrix: list[list[RouteResult]] = [
            [RouteResult(0, 0) for _ in range(n)] for _ in range(n)
        ]

        tasks: list[tuple[int, int]] = []
        for i in range(n):
            for j in range(n):
                if i != j:
                    tasks.append((i, j))

        semaphore = asyncio.Semaphore(8)

        async def fill(i: int, j: int) -> None:
            async with semaphore:
                matrix[i][j] = await self.get_route(points[i], points[j])

        await asyncio.gather(*(fill(i, j) for i, j in tasks))
        return matrix


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
    base_lat, base_lng = 37.5665, 126.9780

    for keyword, (lat, lng) in _KOREA_CITY_COORDS.items():
        if keyword in query:
            base_lat, base_lng = lat, lng
            break

    h = hash(query)
    offset_lat = ((h % 1000) - 500) / 50000
    offset_lng = ((h // 1000 % 1000) - 500) / 50000
    return Coordinate(lat=base_lat + offset_lat, lng=base_lng + offset_lng)


def _haversine_km(a: Coordinate, b: Coordinate) -> float:
    radius_km = 6371.0
    phi_1 = math.radians(a.lat)
    phi_2 = math.radians(b.lat)
    d_phi = math.radians(b.lat - a.lat)
    d_lambda = math.radians(b.lng - a.lng)
    h = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi_1) * math.cos(phi_2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * radius_km * math.asin(math.sqrt(h))


def _mock_route(origin: Coordinate, destination: Coordinate) -> RouteResult:
    straight_km = _haversine_km(origin, destination)
    road_km = straight_km * 1.3
    duration_min = max(1, int(road_km / 25 * 60))
    return RouteResult(
        duration_minutes=duration_min,
        distance_meters=int(road_km * 1000),
        mode="estimated",
        source="fallback",
    )
