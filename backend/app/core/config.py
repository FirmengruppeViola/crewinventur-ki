from pydantic_settings import BaseSettings, SettingsConfigDict, field_validator


class Settings(BaseSettings):
    """Application settings"""

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str | None = None

    # Google Gemini AI
    GOOGLE_GEMINI_API_KEY: str

    # Security - CRITICAL: Must be set in production
    SECRET_KEY: str  # No default value - requires explicit setting

    # Environment
    ENVIRONMENT: str = "development"

    # Cloudflare R2 Storage (S3-compatible)
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str = "crewinventurki-uploads"
    R2_PUBLIC_URL: str | None = None
    STORAGE_PROVIDER: str = "local"  # "local" or "r2"

    # CORS Origins (comma-separated list)
    CORS_ORIGINS: str = "http://localhost:5173,https://crewinventurki.pages.dev,capacitor://localhost,https://localhost,http://localhost"

    # Email (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_USE_TLS: bool = False
    SMTP_USE_SSL: bool = True
    SMTP_VERIFY_CERT: bool = True

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate that SECRET_KEY is not using default insecure value."""
        if v == "your-secret-key-change-this-in-production":
            raise ValueError(
                "SECRET_KEY must be set to a secure random value. "
                "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        if len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters long for security"
            )
        return v

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        valid_environments = {"development", "staging", "production"}
        if v not in valid_environments:
            raise ValueError(
                f"ENVIRONMENT must be one of {valid_environments}, got '{v}'"
            )
        return v

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True
    )


settings = Settings()
