from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/oopsly"
    jwks_url: str = "http://localhost:9010/.well-known/pub.json"
    cors_origins: str = (
        "http://localhost:3000,http://localhost:8080,http://localhost:8081"
    )

    def database_url_normalized(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


settings = Settings()
