from __future__ import annotations

from typing import Any

import httpx

from ..config import settings


DEFAULT_MOBILE_OS = "ETC"
DEFAULT_MOBILE_APP = "OddTrip"


class TourApiClient:
    """Async client for Korea Tourism Organization public tourism APIs."""

    def __init__(self, timeout: float = 2.5):
        self.service_key = settings.tour_api_service_key
        self.related_service_key = settings.tour_api_related_service_key or settings.tour_api_service_key
        self.hub_service_key = settings.tour_api_hub_service_key or settings.tour_api_service_key
        self.bigdata_service_key = settings.tour_api_bigdata_service_key or settings.tour_api_service_key
        self.concentration_service_key = settings.tour_api_concentration_service_key or settings.tour_api_service_key
        self.base_url = settings.tour_api_base_url.rstrip("/")
        self.related_base_url = settings.tour_api_related_base_url.rstrip("/")
        self.hub_base_url = settings.tour_api_hub_base_url.rstrip("/")
        self.bigdata_base_url = settings.tour_api_bigdata_base_url.rstrip("/")
        self.concentration_base_url = settings.tour_api_concentration_base_url.rstrip("/")
        self.timeout = timeout

    @property
    def enabled(self) -> bool:
        return self._has_key(self.service_key)

    async def area_based_list(
        self,
        *,
        area_code: str | None = None,
        sigungu_code: str | None = None,
        content_type_id: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {
            "areaCode": area_code,
            "sigunguCode": sigungu_code,
            "contentTypeId": content_type_id,
            "pageNo": page,
            "numOfRows": rows,
            "arrange": "O",
        }
        return await self._get_items(self.base_url, "/areaBasedList2", params, service_key=self.service_key)

    async def location_based_list(
        self,
        *,
        map_x: float,
        map_y: float,
        radius: int = 3000,
        content_type_id: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {
            "mapX": map_x,
            "mapY": map_y,
            "radius": radius,
            "contentTypeId": content_type_id,
            "pageNo": page,
            "numOfRows": rows,
            "arrange": "E",
        }
        return await self._get_items(self.base_url, "/locationBasedList2", params, service_key=self.service_key)

    async def search_keyword(
        self,
        *,
        keyword: str,
        area_code: str | None = None,
        sigungu_code: str | None = None,
        content_type_id: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {
            "keyword": keyword,
            "areaCode": area_code,
            "sigunguCode": sigungu_code,
            "contentTypeId": content_type_id,
            "pageNo": page,
            "numOfRows": rows,
            "arrange": "O",
        }
        return await self._get_items(self.base_url, "/searchKeyword2", params, service_key=self.service_key)

    async def search_festival(
        self,
        *,
        event_start_date: str,
        event_end_date: str | None = None,
        area_code: str | None = None,
        sigungu_code: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {
            "eventStartDate": event_start_date,
            "eventEndDate": event_end_date,
            "areaCode": area_code,
            "sigunguCode": sigungu_code,
            "pageNo": page,
            "numOfRows": rows,
            "arrange": "O",
        }
        return await self._get_items(self.base_url, "/searchFestival2", params, service_key=self.service_key)

    async def detail_common(self, *, content_id: str, content_type_id: str | None = None) -> dict[str, Any] | None:
        params = {
            "contentId": content_id,
            "contentTypeId": content_type_id,
            "defaultYN": "Y",
            "firstImageYN": "Y",
            "addrinfoYN": "Y",
            "mapinfoYN": "Y",
            "overviewYN": "Y",
        }
        items = await self._get_items(self.base_url, "/detailCommon2", params, service_key=self.service_key)
        return items[0] if items else None

    async def detail_intro(self, *, content_id: str, content_type_id: str) -> dict[str, Any] | None:
        items = await self._get_items(self.base_url, "/detailIntro2", {"contentId": content_id, "contentTypeId": content_type_id}, service_key=self.service_key)
        return items[0] if items else None

    async def detail_images(self, *, content_id: str, rows: int = 10) -> list[dict[str, Any]]:
        return await self._get_items(self.base_url, "/detailImage2", {"contentId": content_id, "imageYN": "Y", "subImageYN": "Y", "numOfRows": rows}, service_key=self.service_key)

    async def related_attractions_by_area(
        self,
        *,
        area_code: str,
        sigungu_code: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {"areaCd": area_code, "signguCd": sigungu_code, "pageNo": page, "numOfRows": rows}
        return await self._get_items(self.related_base_url, "/areaBasedList1", params, service_key=self.related_service_key)

    async def related_attractions_by_keyword(
        self,
        *,
        keyword: str,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        return await self._get_items(self.related_base_url, "/searchKeyword1", {"keyword": keyword, "pageNo": page, "numOfRows": rows}, service_key=self.related_service_key)

    async def hub_attractions(
        self,
        *,
        area_code: str,
        sigungu_code: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        params = {"areaCd": area_code, "signguCd": sigungu_code, "pageNo": page, "numOfRows": rows}
        return await self._get_items(self.hub_base_url, "/areaBasedList1", params, service_key=self.hub_service_key)

    async def visitor_trend(self, *, operation: str = "/visitorTrend", **params: Any) -> list[dict[str, Any]]:
        return await self._get_items(self.bigdata_base_url, operation, params, service_key=self.bigdata_service_key)

    async def concentration_prediction(self, *, operation: str = "/areaBasedList1", **params: Any) -> list[dict[str, Any]]:
        return await self._get_items(self.concentration_base_url, operation, params, service_key=self.concentration_service_key)

    async def _get_items(self, base_url: str, operation: str, params: dict[str, Any], *, service_key: str) -> list[dict[str, Any]]:
        if not self._has_key(service_key):
            return []

        query = {
            "serviceKey": service_key,
            "MobileOS": DEFAULT_MOBILE_OS,
            "MobileApp": DEFAULT_MOBILE_APP,
            "_type": "json",
            **{key: value for key, value in params.items() if value not in (None, "")},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{base_url}{operation}", params=query)
            response.raise_for_status()
            payload = response.json()

        return self._items(payload)

    def _items(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        body = payload.get("response", {}).get("body", {})
        items = body.get("items", {})
        item = items.get("item") if isinstance(items, dict) else None
        if item is None:
            return []
        if isinstance(item, list):
            return item
        return [item]

    def _has_key(self, service_key: str) -> bool:
        return bool(
            service_key
            and service_key not in {
                "your-data-go-kr-service-key",
                "your-related-attractions-key-or-empty",
                "your-hub-attractions-key-or-empty",
                "your-bigdata-key-or-empty",
                "your-concentration-prediction-key-or-empty",
            }
        )


tour_api_client = TourApiClient()
