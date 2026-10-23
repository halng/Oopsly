from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/oopsly"
    )
    jwt_secret: str = (
        "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"
    )
    jwt_public_key: str = ""
    cors_origins: str = "http://localhost:3000,http://localhost:8081"

    def database_url_normalized(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


settings = Settings()
