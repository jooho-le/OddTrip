from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx

from ..config import settings


DEFAULT_MOBILE_OS = "ETC"
DEFAULT_MOBILE_APP = "OddTrip"

# KorService2 uses TourAPI's legacy area codes while the DataLab-derived
# services use five-digit legal-dong codes. Context calls need an explicit
# conversion or a valid KorService2 request (for example Seoul=1) is rejected
# by the related/hub/concentration APIs (for example Seoul=11).
TOUR_TO_LEGAL_AREA_CODE = {
    "1": "11",   # 서울
    "2": "28",   # 인천
    "3": "30",   # 대전
    "4": "27",   # 대구
    "5": "29",   # 광주
    "6": "26",   # 부산
    "7": "31",   # 울산
    "8": "36",   # 세종
    "31": "41",  # 경기
    "32": "51",  # 강원
    "33": "43",  # 충북
    "34": "44",  # 충남
    "35": "47",  # 경북
    "36": "48",  # 경남
    "37": "52",  # 전북
    "38": "46",  # 전남
    "39": "50",  # 제주
}

# The three context APIs require a sigungu even when the product only knows a
# province-level trip region. Use the capital/central district as a stable
# representative in that case. A caller that already has a five-digit legal
# sigungu code always takes precedence.
DEFAULT_LEGAL_SIGUNGU_CODE = {
    "11": "11110",  # 서울 종로구
    "26": "26110",  # 부산 중구
    "27": "27110",  # 대구 중구
    "28": "28110",  # 인천 중구
    "29": "29110",  # 광주 동구
    "30": "30110",  # 대전 동구
    "31": "31110",  # 울산 중구
    "36": "36110",  # 세종특별자치시
    "41": "41111",  # 경기 수원시 장안구
    "43": "43111",  # 충북 청주시 상당구
    "44": "44131",  # 충남 천안시 동남구
    "46": "46110",  # 전남 목포시
    "47": "47111",  # 경북 포항시 남구
    "48": "48121",  # 경남 창원시 의창구
    "50": "50110",  # 제주 제주시
    "51": "51110",  # 강원 춘천시
    "52": "52111",  # 전북 전주시 완산구
}


class TourApiError(RuntimeError):
    """A successful HTTP response that contains a TourAPI error code."""


def _context_region_codes(
    area_code: str | None,
    sigungu_code: str | None,
) -> tuple[str, str]:
    raw_area = str(area_code or "1").strip()
    legal_area = TOUR_TO_LEGAL_AREA_CODE.get(raw_area, raw_area if len(raw_area) == 2 else "11")
    raw_sigungu = str(sigungu_code or "").strip()

    if len(raw_sigungu) == 5 and raw_sigungu.startswith(legal_area):
        legal_sigungu = raw_sigungu
    elif len(raw_sigungu) == 3 and raw_sigungu.isdigit():
        legal_sigungu = f"{legal_area}{raw_sigungu}"
    else:
        legal_sigungu = DEFAULT_LEGAL_SIGUNGU_CODE.get(legal_area, "11110")
    return legal_area, legal_sigungu


def _previous_month_start(today: date | None = None) -> date:
    current = today or date.today()
    last_day = current.replace(day=1) - timedelta(days=1)
    return last_day.replace(day=1)


def _base_month(value: str | None = None) -> str:
    return value or _previous_month_start().strftime("%Y%m")


class TourApiClient:
    """Async client for Korea Tourism Organization public tourism APIs."""

    def __init__(
        self,
        timeout: float = 8.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
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
        self.transport = transport

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
        base_month: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        legal_area, legal_sigungu = _context_region_codes(area_code, sigungu_code)
        params = {
            "baseYm": _base_month(base_month),
            "areaCd": legal_area,
            "signguCd": legal_sigungu,
            "pageNo": page,
            "numOfRows": rows,
        }
        return await self._get_items(self.related_base_url, "/areaBasedList1", params, service_key=self.related_service_key)

    async def related_attractions_by_keyword(
        self,
        *,
        keyword: str,
        area_code: str,
        sigungu_code: str | None = None,
        base_month: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        legal_area, legal_sigungu = _context_region_codes(area_code, sigungu_code)
        params = {
            "baseYm": _base_month(base_month),
            "areaCd": legal_area,
            "signguCd": legal_sigungu,
            "keyword": keyword,
            "pageNo": page,
            "numOfRows": rows,
        }
        return await self._get_items(self.related_base_url, "/searchKeyword1", params, service_key=self.related_service_key)

    async def hub_attractions(
        self,
        *,
        area_code: str,
        sigungu_code: str | None = None,
        base_month: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        legal_area, legal_sigungu = _context_region_codes(area_code, sigungu_code)
        params = {
            "baseYm": _base_month(base_month),
            "areaCd": legal_area,
            "signguCd": legal_sigungu,
            "pageNo": page,
            "numOfRows": rows,
        }
        return await self._get_items(self.hub_base_url, "/areaBasedList1", params, service_key=self.hub_service_key)

    async def visitor_trend(
        self,
        *,
        area_code: str,
        sigungu_code: str | None = None,
        target_date: date | None = None,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        # locgoRegnVisitrDDList rejects areaCd/signguCd request parameters. Pull
        # one completed day (well under 1,000 rows), then filter signguCode in
        # the response. This avoids downloading an entire month of 15k+ rows.
        _, legal_sigungu = _context_region_codes(area_code, sigungu_code)
        completed_day = target_date or _previous_month_start()
        ymd = completed_day.strftime("%Y%m%d")
        items = await self._get_items(
            self.bigdata_base_url,
            "/locgoRegnVisitrDDList",
            {
                "startYmd": ymd,
                "endYmd": ymd,
                "pageNo": 1,
                "numOfRows": 1000,
            },
            service_key=self.bigdata_service_key,
        )
        return [
            item
            for item in items
            if str(item.get("signguCode") or item.get("signguCd") or "") == legal_sigungu
        ][:rows]

    async def concentration_prediction(
        self,
        *,
        area_code: str,
        sigungu_code: str | None = None,
        page: int = 1,
        rows: int = 20,
    ) -> list[dict[str, Any]]:
        legal_area, legal_sigungu = _context_region_codes(area_code, sigungu_code)
        return await self._get_items(
            self.concentration_base_url,
            "/tatsCnctrRatedList",
            {
                "areaCd": legal_area,
                "signguCd": legal_sigungu,
                "pageNo": page,
                "numOfRows": rows,
            },
            service_key=self.concentration_service_key,
        )

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
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
            response = await client.get(f"{base_url}{operation}", params=query)
            response.raise_for_status()
            payload = response.json()

        result_code = str(
            payload.get("resultCode")
            or payload.get("response", {}).get("header", {}).get("resultCode")
            or "0000"
        )
        if result_code in {"03", "NO_DATA"}:
            return []
        if result_code not in {"0", "00", "0000"}:
            result_message = (
                payload.get("resultMsg")
                or payload.get("response", {}).get("header", {}).get("resultMsg")
                or "TourAPI request failed"
            )
            raise TourApiError(f"TourAPI error {result_code}: {result_message}")

        return self._items(payload)

    def _items(self, payload: dict[str, Any]) -> list[dict[str, Any]]:
        body = payload.get("response", {}).get("body", payload)
        items = body.get("items", {})
        item = items.get("item") if isinstance(items, dict) else items if isinstance(items, list) else None
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
