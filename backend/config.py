from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__", extra="allow", arbitrary_types_allowed=True)

    app_name: str = "ATD Test Case Generator"
    environment: str = "development"
    database_url: str = f"sqlite:///{(STORAGE_DIR / 'app.db').absolute()}"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    openai_base_url: Optional[str] = None

    allowed_origins: List[str] = ["*"]

    docling_base_url: Optional[str] = None
    file_storage_root: Path = STORAGE_DIR / "files"

    export_timezone: str = "UTC"



@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.file_storage_root.mkdir(parents=True, exist_ok=True)
    return settings
