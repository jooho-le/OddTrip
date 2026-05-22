"""InputPlace를 PlannedPlace로 보강.

각 장소에 대해 병렬로 좌표/운영시간을 가져옵니다.
N개 장소가 있어도 응답 시간은 1개와 거의 같음 (asyncio.gather).
"""
from __future__ import annotations

import asyncio
from typing import Iterable

from ..clients import GoogleMapsClient, PlaceInfoClient
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
        # 좌표 검색
        coord_task = self.google_maps.search_coordinate(
            f"{place.name} {place.category}"
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
            info=info,
            description=place.description,
            famous=place.famous,
            active=place.active,
        )
