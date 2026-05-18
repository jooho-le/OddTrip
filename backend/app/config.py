from pathlib import Path

from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = "mysql+aiomysql://root:password@localhost:3306/oddtrip"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:5173"
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$"
    tour_api_service_key: str = ""
    tour_api_related_service_key: str = ""
    tour_api_hub_service_key: str = ""
    tour_api_bigdata_service_key: str = ""
    tour_api_concentration_service_key: str = ""
    tour_api_base_url: str = "https://apis.data.go.kr/B551011/KorService2"
    tour_api_related_base_url: str = "https://apis.data.go.kr/B551011/TarRlteTarService1"
    tour_api_hub_base_url: str = "https://apis.data.go.kr/B551011/LocgoHubTarService1"
    tour_api_bigdata_base_url: str = "https://apis.data.go.kr/B551011/DataLabService"
    tour_api_concentration_base_url: str = "https://apis.data.go.kr/B551011/TarCongestionService"

    model_config = {"env_file": str(_env_path), "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
