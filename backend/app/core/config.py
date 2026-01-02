from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str | None = None

    # Google Gemini AI
    GOOGLE_GEMINI_API_KEY: str

    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"

    # Environment
    ENVIRONMENT: str = "development"

    # Cloudflare R2 Storage (S3-compatible)
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str = "crewinventurki-uploads"
    R2_PUBLIC_URL: str | None = None
    STORAGE_PROVIDER: str = "local"  # "local" or "r2"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = False
    SMTP_USE_SSL: bool = True
    SMTP_VERIFY_CERT: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


settings = Settings()
