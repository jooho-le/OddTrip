import asyncio
from datetime import date

import httpx
import pytest

from backend.app.services.tour_api_client import (
    TourApiClient,
    TourApiError,
    _context_region_codes,
    _previous_month_start,
)


def _success(items: list[dict]) -> dict:
    return {
        "response": {
            "header": {"resultCode": "0000", "resultMsg": "OK"},
            "body": {
                "items": {"item": items},
                "totalCount": len(items),
            },
        }
    }


def _client(handler) -> TourApiClient:
    client = TourApiClient(transport=httpx.MockTransport(handler))
    client.service_key = "test-key"
    client.related_service_key = "test-key"
    client.hub_service_key = "test-key"
    client.bigdata_service_key = "test-key"
    client.concentration_service_key = "test-key"
    client.related_base_url = "https://example.test/TarRlteTarService1"
    client.hub_base_url = "https://example.test/LocgoHubTarService1"
    client.bigdata_base_url = "https://example.test/DataLabService"
    client.concentration_base_url = "https://example.test/TatsCnctrRateService"
    return client


def test_context_region_codes_convert_tourapi_codes() -> None:
    assert _context_region_codes("1", None) == ("11", "11110")
    assert _context_region_codes("32", None) == ("51", "51110")
    assert _context_region_codes("1", "11140") == ("11", "11140")
    assert _context_region_codes("51", "130") == ("51", "51130")


def test_previous_month_start_handles_year_boundary() -> None:
    assert _previous_month_start(date(2026, 9, 19)) == date(2026, 8, 1)
    assert _previous_month_start(date(2026, 1, 1)) == date(2025, 12, 1)


def test_context_apis_use_current_contracts_and_filter_visitors() -> None:
    seen: dict[str, httpx.QueryParams] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        seen[path] = request.url.params

        if path.endswith("/TarRlteTarService1/areaBasedList1"):
            return httpx.Response(200, json=_success([{"rlteTatsNm": "북촌", "rlteRank": "1"}]))
        if path.endswith("/LocgoHubTarService1/areaBasedList1"):
            return httpx.Response(200, json=_success([{"hubTatsNm": "경복궁", "hubRank": "1"}]))
        if path.endswith("/DataLabService/locgoRegnVisitrDDList"):
            return httpx.Response(200, json=_success([
                {"signguCode": "11110", "signguNm": "종로구", "touNum": "120"},
                {"signguCode": "26110", "signguNm": "부산 중구", "touNum": "80"},
            ]))
        if path.endswith("/TatsCnctrRateService/tatsCnctrRatedList"):
            return httpx.Response(200, json=_success([{"tAtsNm": "경복궁", "cnctrRate": "42.5"}]))
        raise AssertionError(f"unexpected request: {path}")

    async def run() -> tuple[list[dict], list[dict], list[dict], list[dict]]:
        client = _client(handler)
        return (
            await client.related_attractions_by_area(
                area_code="1", base_month="202608", rows=50
            ),
            await client.hub_attractions(
                area_code="1", base_month="202608", rows=50
            ),
            await client.visitor_trend(
                area_code="1", target_date=date(2026, 8, 1), rows=20
            ),
            await client.concentration_prediction(area_code="1", rows=20),
        )

    related, hub, visitors, concentration = asyncio.run(run())

    assert related[0]["rlteTatsNm"] == "북촌"
    assert hub[0]["hubTatsNm"] == "경복궁"
    assert visitors == [{"signguCode": "11110", "signguNm": "종로구", "touNum": "120"}]
    assert concentration[0]["cnctrRate"] == "42.5"

    related_query = seen["/TarRlteTarService1/areaBasedList1"]
    assert related_query["baseYm"] == "202608"
    assert related_query["areaCd"] == "11"
    assert related_query["signguCd"] == "11110"

    hub_query = seen["/LocgoHubTarService1/areaBasedList1"]
    assert hub_query["baseYm"] == "202608"
    assert hub_query["areaCd"] == "11"
    assert hub_query["signguCd"] == "11110"

    visitor_query = seen["/DataLabService/locgoRegnVisitrDDList"]
    assert visitor_query["startYmd"] == "20260801"
    assert visitor_query["endYmd"] == "20260801"
    assert "areaCd" not in visitor_query
    assert "signguCd" not in visitor_query

    concentration_query = seen["/TatsCnctrRateService/tatsCnctrRatedList"]
    assert concentration_query["areaCd"] == "11"
    assert concentration_query["signguCd"] == "11110"


def test_tour_api_error_payload_is_not_silently_treated_as_empty() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "resultCode": "11",
                "resultMsg": "NO_MANDATORY_REQUEST_PARAMETERS_ERROR1(baseYm)",
            },
        )

    async def run() -> None:
        client = _client(handler)
        await client.hub_attractions(area_code="1", base_month="202608")

    with pytest.raises(TourApiError, match="baseYm"):
        asyncio.run(run())
