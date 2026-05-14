from pathlib import Path

from pydantic_settings import BaseSettings

_env_path = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    database_url: str = "mysql+aiomysql://root:password@localhost:3306/oddtrip"
    openai_api_key: str = ""
    cors_origins: str = "http://localhost:5173"

    model_config = {"env_file": str(_env_path), "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
