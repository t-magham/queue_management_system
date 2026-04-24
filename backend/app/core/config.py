# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str
    CORS_ORIGINS: str = ""
    # the .env file configuration
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    @property
    def cors_origins_list(self):
        if not self.CORS_ORIGINS:
            return []
        return [origin.split() for origin in self.CORS_ORIGINS.split(",") if origin]

settings = Settings()
