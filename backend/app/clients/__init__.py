"""외부 API 클라이언트 모음.

각 클라이언트는 API 키가 없으면 mock 데이터를 반환하도록 설계되어 있어,
개발 / 데모 환경에서도 막힘 없이 동작합니다.

- google_maps_client       : 좌표 검색, 길찾기 (이동시간 계산)
- weather_client     : 기상청 날씨 예보 + 자외선 지수
- disaster_client    : 행정안전부 재난문자 / 안전 정보
- place_info_client  : 장소 운영시간, 휴무일 (LLM 기반 추론)
"""
from .google_maps_client import GoogleMapsClient, Coordinate, RouteResult
from .weather_client import WeatherClient, WeatherForecast
from .disaster_client import DisasterClient, DisasterAlert
from .place_info_client import PlaceInfoClient, PlaceInfo

__all__ = [
    "GoogleMapsClient", "Coordinate", "RouteResult",
    "WeatherClient", "WeatherForecast",
    "DisasterClient", "DisasterAlert",
    "PlaceInfoClient", "PlaceInfo",
]
