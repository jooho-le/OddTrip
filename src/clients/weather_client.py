"""기상청 동네예보 + 자외선 지수 클라이언트.

──────────────────────────────────────
역할
──────────────────────────────────────
여행 일자별 날씨와 자외선 정보를 가져옵니다.
- condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'storm'
- temperature: 평균 기온 (섭씨)
- precipitation_prob: 강수 확률 (0~100)
- uv_index: 자외선 지수 (0~11+)

──────────────────────────────────────
활용
──────────────────────────────────────
day_assigner와 time_scheduler에서:
- 비/눈 오는 날 → 실내 장소 우선 배치
- 자외선 강한 날 → 야외 활동 시 모자/선크림 권장 메시지
- 폭풍 → 안전 경고

──────────────────────────────────────
좌표 변환
──────────────────────────────────────
기상청은 위경도가 아닌 격자(nx, ny) 좌표를 씁니다.
Lambert Conformal Conic 투영 공식으로 변환합니다 (한국 영역).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

import httpx

from ..config import settings


WeatherCondition = Literal["sunny", "cloudy", "rain", "snow", "storm"]


@dataclass
class WeatherForecast:
    """하루치 날씨 예보 데이터."""
    target_date: date
    condition: WeatherCondition
    temperature: float
    precipitation_prob: int
    uv_index: int
    description: str = ""

    @property
    def is_bad_weather(self) -> bool:
        """일정 변경이 권장되는 악천후 여부."""
        return (
            self.condition in ("rain", "snow", "storm")
            or self.precipitation_prob >= 60
        )

    @property
    def is_high_uv(self) -> bool:
        """자외선 강도가 높아 야외 활동 시 주의가 필요한 수준 (UV 8+)."""
        return self.uv_index >= 8


KMA_FORECAST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
)


class WeatherClient:
    """기상청 날씨/자외선 클라이언트.

    API 키 없으면 결정론적 mock 사용 (날짜 기반 패턴).
    """

    def __init__(self) -> None:
        self.api_key: str = getattr(settings, "kma_api_key", "") or ""
        self.enabled: bool = bool(self.api_key)

    async def get_forecast(
        self, target_date: date, lat: float, lng: float
    ) -> WeatherForecast:
        """특정 날짜+위치의 날씨 예보."""
        if not self.enabled:
            return _mock_forecast(target_date)

        nx, ny = _latlng_to_grid(lat, lng)
        base_date = target_date.strftime("%Y%m%d")
        base_time = "0500"  # 05시 발표 데이터 사용

        params = {
            "serviceKey": self.api_key,
            "numOfRows": 1000,
            "pageNo": 1,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as http:
                resp = await http.get(KMA_FORECAST_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError):
            return _mock_forecast(target_date)

        return _parse_kma_response(data, target_date)

    async def get_range_forecast(
        self,
        start_date: date,
        end_date: date,
        lat: float,
        lng: float,
    ) -> list[WeatherForecast]:
        """여행 기간 전체에 대한 일자별 예보 리스트."""
        forecasts: list[WeatherForecast] = []
        current = start_date
        while current <= end_date:
            forecasts.append(await self.get_forecast(current, lat, lng))
            current += timedelta(days=1)
        return forecasts


# ══════════════════════════════════════════════════════
# 좌표 변환 (위경도 -> 기상청 격자)
# ══════════════════════════════════════════════════════
def _latlng_to_grid(lat: float, lng: float) -> tuple[int, int]:
    """Lambert Conformal Conic 투영. 한국 영역에서만 정확."""
    import math as m

    RE = 6371.00877
    GRID = 5.0
    SLAT1 = 30.0
    SLAT2 = 60.0
    OLON = 126.0
    OLAT = 38.0
    XO = 43
    YO = 136

    DEGRAD = m.pi / 180.0
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = m.tan(m.pi * 0.25 + slat2 * 0.5) / m.tan(m.pi * 0.25 + slat1 * 0.5)
    sn = m.log(m.cos(slat1) / m.cos(slat2)) / m.log(sn)
    sf = m.tan(m.pi * 0.25 + slat1 * 0.5)
    sf = (sf ** sn) * m.cos(slat1) / sn
    ro = m.tan(m.pi * 0.25 + olat * 0.5)
    ro = re * sf / (ro ** sn)

    ra = m.tan(m.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = re * sf / (ra ** sn)
    theta = lng * DEGRAD - olon
    if theta > m.pi:
        theta -= 2 * m.pi
    if theta < -m.pi:
        theta += 2 * m.pi
    theta *= sn

    nx = int(ra * m.sin(theta) + XO + 0.5)
    ny = int(ro - ra * m.cos(theta) + YO + 0.5)
    return nx, ny


def _parse_kma_response(data: dict, target_date: date) -> WeatherForecast:
    """기상청 응답 JSON -> WeatherForecast 변환."""
    items = (
        data.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item", [])
    )

    date_str = target_date.strftime("%Y%m%d")
    temps: list[float] = []
    pops: list[int] = []
    sky_vals: list[int] = []
    pty_vals: list[int] = []

    for item in items:
        if item.get("fcstDate") != date_str:
            continue
        category = item.get("category")
        value = item.get("fcstValue", "0")
        try:
            num = float(value)
        except ValueError:
            continue

        if category == "TMP":
            temps.append(num)
        elif category == "POP":
            pops.append(int(num))
        elif category == "SKY":
            sky_vals.append(int(num))
        elif category == "PTY":
            pty_vals.append(int(num))

    avg_temp = sum(temps) / len(temps) if temps else 20.0
    max_pop = max(pops) if pops else 0
    condition = _resolve_condition(sky_vals, pty_vals)

    return WeatherForecast(
        target_date=target_date,
        condition=condition,
        temperature=round(avg_temp, 1),
        precipitation_prob=max_pop,
        uv_index=_estimate_uv(condition, target_date.month),
        description=_describe_weather(condition, avg_temp, max_pop),
    )


def _resolve_condition(sky: list[int], pty: list[int]) -> WeatherCondition:
    """기상청 SKY/PTY 코드 -> 우리 condition 매핑.

    PTY: 0(없음) 1(비) 2(비/눈) 3(눈) 4(소나기)
    SKY: 1(맑음) 3(구름많음) 4(흐림)
    """
    if any(p == 3 for p in pty):
        return "snow"
    if any(p in (1, 2, 4) for p in pty):
        return "rain"
    if any(s >= 3 for s in sky):
        return "cloudy"
    return "sunny"


def _estimate_uv(condition: WeatherCondition, month: int) -> int:
    """자외선 지수 추정 (실제로는 별도 API 호출).

    여름철 + 맑은 날일수록 높음. 0~11+ 범위.
    """
    base = {6: 9, 7: 10, 8: 10, 5: 8, 9: 7}.get(month, 5)
    if condition == "rain" or condition == "storm":
        base -= 4
    elif condition == "cloudy":
        base -= 2
    return max(0, base)


def _describe_weather(
    condition: WeatherCondition, temp: float, pop: int
) -> str:
    desc_map = {
        "sunny": "맑음",
        "cloudy": "구름 많음",
        "rain": "비",
        "snow": "눈",
        "storm": "강풍/뇌우",
    }
    base = desc_map.get(condition, "정보 없음")
    return f"{base}, 체감 {int(temp)}도, 강수확률 {pop}%"


# ══════════════════════════════════════════════════════
# Mock 유틸리티
# ══════════════════════════════════════════════════════
def _mock_forecast(target_date: date) -> WeatherForecast:
    """날짜 기반 결정론적 mock. 분포: 맑음 55% / 흐림 20% / 비 15% / 폭풍 10%."""
    seed = (target_date.toordinal() * 7) % 100
    if seed < 55:
        condition: WeatherCondition = "sunny"
        pop = 10
    elif seed < 75:
        condition = "cloudy"
        pop = 30
    elif seed < 90:
        condition = "rain"
        pop = 70
    else:
        condition = "storm"
        pop = 85

    month = target_date.month
    temp = {
        12: 2, 1: 0, 2: 3, 3: 10, 4: 16, 5: 21,
        6: 25, 7: 28, 8: 29, 9: 23, 10: 17, 11: 9,
    }[month]

    return WeatherForecast(
        target_date=target_date,
        condition=condition,
        temperature=float(temp),
        precipitation_prob=pop,
        uv_index=_estimate_uv(condition, month),
        description=_describe_weather(condition, temp, pop),
    )
