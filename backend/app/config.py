from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    ENCRYPTION_KEY: str

    DATABASE_URL: str
    MONGODB_URL: str
    MONGO_DATABASE: str = "slidesdb"
    REDIS_URL: str = "redis://redis:6379/0"

    # Optional — free key at unsplash.com/developers (50 req/hour)
    UNSPLASH_ACCESS_KEY: str = ""

    model_config = {"env_file": ".env"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
