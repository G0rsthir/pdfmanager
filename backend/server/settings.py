from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from .const import ENCODING, EnvironmentsEnum


class BaseEnvSettings(BaseSettings):
    """
    Base settings class for environment-specific settings.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding=ENCODING)


class AppEnvSettings(BaseEnvSettings):
    """
    App Env settings. Restart is required for changes to take effect.
    """

    model_config = SettingsConfigDict(env_prefix="APP_", env_nested_delimiter="__", extra="ignore")

    # Database engine connection string.
    # SQLite - sqlite+aiosqlite:///<db_file>
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///storage/sqlite.db", exclude=True)

    # Current environment (e.g., development, production).
    ENVIRONMENT: str = EnvironmentsEnum.DEVELOPMENT

    # Secret key used to encode and decode access JWT tokens.
    ACCESS_JWT_SECRET: str = Field(default="", exclude=True)

    # Secret key used to encode and decode refresh JWT tokens.
    REFRESH_JWT_SECRET: str = Field(default="", exclude=True)

    # Lifespan of access JWT tokens.
    ACCESS_JWT_LIFESPAN: int = Field(default=5)

    # Lifespan of refresh JWT tokens.
    REFRESH_JWT_LIFESPAN: int = Field(default=7 * 60 * 24)

    # Path to the folder that contains data files.
    STORAGE_DIR: str = "storage"
