"""Application configuration, loaded from environment / .env file.

All values map case-insensitively to the env vars listed in .env.example,
e.g. the field ``mongodb_uri`` reads ``MONGODB_URI``.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Database ---
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "h2_kitchen"

    # --- Auth (JWT) ---
    jwt_secret: str = "change-me-please-use-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 1 day

    # --- External services (used in later roadmap steps) ---
    discord_webhook_url: str = ""
    bank_account_info: str = ""
    # Cloudinary: either a single CLOUDINARY_URL, or the three parts below.
    cloudinary_url: str = ""
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    # SePay bank webhook (auto-confirm transfers). Same key set in SePay dashboard.
    sepay_webhook_api_key: str = ""

    # --- CORS ---
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Local dev conveniences ---
    use_mock_db: bool = False
    seed_on_startup: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
