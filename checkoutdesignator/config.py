from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration derived from environment variables."""

    app_name: str = "CheckoutDesignator"
    attribution: str = "Built by SK R&D for SK Games"
    database_url: str = "sqlite:///./checkoutdesignator.db"
    model_config = SettingsConfigDict(
        env_prefix="CHECKOUT_DESIGNATOR_",
        env_file=".env",
        env_file_encoding="utf-8",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
