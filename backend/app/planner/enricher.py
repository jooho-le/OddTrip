"""InputPlace를 PlannedPlace로 보강.

각 장소에 대해 병렬로 좌표/운영시간을 가져옵니다.
N개 장소가 있어도 응답 시간은 1개와 거의 같음 (asyncio.gather).
"""
from __future__ import annotations

import asyncio
from datetime import time
from typing import Iterable

from ..clients import GoogleMapsClient, PlaceInfoClient
from ..clients.google_maps_client import Coordinate
from ..clients.place_info_client import PlaceInfo
from .models import InputPlace, PlannedPlace


class PlaceEnricher:
    """InputPlace → PlannedPlace 변환기."""

    def __init__(
        self,
        google_maps: GoogleMapsClient,
        place_info: PlaceInfoClient,
    ) -> None:
        self.google_maps = google_maps
        self.place_info = place_info

    async def enrich_many(
        self, places: Iterable[InputPlace]
    ) -> list[PlannedPlace]:
        """여러 장소를 병렬로 보강.

        좌표를 못 찾은 장소는 제외됩니다 (mock 모드에선 항상 찾음).
        """
        place_list = list(places)
        tasks = [self._enrich_one(p) for p in place_list]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]

    async def _enrich_one(self, place: InputPlace) -> PlannedPlace | None:
        """한 장소를 보강. 좌표/운영시간 동시 호출 (병렬)."""
        coord_task = (
            _provided_coordinate(place)
            if place.latitude is not None and place.longitude is not None
            else self.google_maps.search_coordinate(f"{place.name} {place.category}")
        )
        # 운영시간 추론
        info_task = self.place_info.get_info(place.name, place.category)

        coord, info = await asyncio.gather(coord_task, info_task)

        if coord is None:
            return None

        return PlannedPlace(
            input_id=place.id,
            name=place.name,
            category=place.category,
            coord=coord,
            info=_apply_input_overrides(info, place),
            description=place.description,
            famous=place.famous,
            active=place.active,
        )


async def _provided_coordinate(place: InputPlace) -> Coordinate:
    return Coordinate(lat=float(place.latitude), lng=float(place.longitude))


def _apply_input_overrides(info: PlaceInfo, place: InputPlace) -> PlaceInfo:
    if place.indoor is not None:
        info.indoor = bool(place.indoor)

    parsed_hours = _parse_structured_hours(place.opening_hours)
    if parsed_hours:
        info.opening_hours = parsed_hours

    return info


def _parse_structured_hours(raw: dict | None):
    """Accept future structured hours without depending on LLM inference.

    Current TourAPI enrichment often stores a free-text raw field, which is not
    reliable enough to schedule from. If a caller provides weekday-indexed
    hours, prefer those exact values.
    """
    if not isinstance(raw, dict):
        return None

    weekly = raw.get("weekly") or raw.get("opening_hours")
    if not isinstance(weekly, list) or len(weekly) != 7:
        return None

    parsed = []
    for item in weekly:
        if item is None:
            parsed.append(None)
            continue
        try:
            open_t = _parse_hhmm(str(item["open"]))
            close_t = _parse_hhmm(str(item["close"]))
        except (KeyError, TypeError, ValueError):
            return None
        parsed.append((open_t, close_t))
    return parsed


def _parse_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))
