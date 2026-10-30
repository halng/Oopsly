from datetime import timedelta
from urllib.parse import quote

from pydantic_settings import BaseSettings, SettingsConfigDict


def _split(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = ""
    port: int = 9010

    database_url: str = ""
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "oopsly"
    db_username: str = "postgres"
    db_password: str = "postgres"

    redis_host: str = "localhost"
    redis_port: int = 6379

    jwt_expiration_ms: int = 86_400_000
    jwt_refresh_expiration_ms: int = 604_800_000
    # Private signing keys are stored encrypted with this passphrase when it is set.
    jwt_key_passphrase: str = ""
    # A key signs for this long, then the next (already published) key takes over.
    jwt_key_rotation_days: int = 7
    # The next key is published this long before it signs, so verifiers cache it.
    jwt_key_publish_lead_hours: int = 24
    jwt_key_rotation_check_seconds: int = 3600
    jwt_key_cache_seconds: int = 60

    test_emails: str = ""
    internal_api_key: str = "Jtz+A7HbztjSTpiLI0FZXd2NffOnP2wm0KGbwfDnFAo="

    # Profile pictures: leave the bucket empty to turn avatar uploads off.
    avatar_bucket: str = ""
    avatar_region: str = ""
    avatar_url_ttl_seconds: int = 3600
    # Only for S3-compatible stores such as MinIO. The public one is what
    # browsers can reach; the other is what this service uses.
    avatar_s3_endpoint: str = ""
    avatar_s3_public_endpoint: str = ""

    allowed_origins: str = "http://localhost:8080,http://localhost:8081"

    def database_url_normalized(self) -> str:
        url = self.database_url
        if not url:
            return (
                f"postgresql+psycopg://{quote(self.db_username, safe='')}"
                f":{quote(self.db_password, safe='')}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}"
            )
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url

    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}"

    @property
    def access_ttl(self) -> timedelta:
        return timedelta(milliseconds=self.jwt_expiration_ms)

    @property
    def refresh_ttl(self) -> timedelta:
        return timedelta(milliseconds=self.jwt_refresh_expiration_ms)

    @property
    def key_rotation_interval(self) -> timedelta:
        return timedelta(days=self.jwt_key_rotation_days)

    @property
    def key_publish_lead(self) -> timedelta:
        return min(
            timedelta(hours=self.jwt_key_publish_lead_hours),
            self.key_rotation_interval / 2,
        )

    @property
    def key_retention(self) -> timedelta:
        """How long a retired key stays in the JWKS: until its last token expires."""
        return max(self.access_ttl, self.refresh_ttl) + timedelta(hours=1)

    @property
    def test_email_list(self) -> list[str]:
        return _split(self.test_emails)

    @property
    def origins(self) -> list[str]:
        return _split(self.allowed_origins)


settings = Settings()
