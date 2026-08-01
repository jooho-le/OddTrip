from pathlib import Path

from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parents[2] / ".env"
_project_root = _env_path.parent


class Settings(BaseSettings):
    # Required on purpose. A default here is dangerous: if DATABASE_URL is
    # missing in a deployed container the app would silently connect to the
    # wrong database instead of refusing to start.
    database_url: str
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    auth_secret_key: str = "change-this-secret-before-deploy"
    # Access tokens cannot be revoked, so keep them short and let the client
    # exchange a refresh token for a new one.
    auth_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    allow_demo_user_header_auth: bool = False
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
    google_maps_api_key: str = ""
    kma_api_key: str = ""
    mois_api_key: str = ""

    model_config = {"env_file": str(_env_path), "env_file_encoding": "utf-8", "extra": "ignore"}


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)

    sqlite_prefix = "sqlite+aiosqlite:///"
    if not url.startswith(sqlite_prefix):
        return url

    path_part = url.removeprefix(sqlite_prefix)
    if path_part == ":memory:":
        return url
    if path_part.startswith("/"):
        return url

    db_path = (_project_root / path_part).resolve()
    return f"{sqlite_prefix}{db_path}"


settings = Settings()
settings.database_url = _normalize_database_url(settings.database_url)
