from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from app.config import settings


class Base(DeclarativeBase):
    pass


engine: AsyncEngine | None = None
async_session_factory: async_sessionmaker | None = None
mongo_client: AsyncIOMotorClient | None = None
redis_client: aioredis.Redis | None = None


async def init_db() -> None:
    global engine, async_session_factory, mongo_client, redis_client

    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
    )
    async_session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def close_db() -> None:
    global engine, mongo_client, redis_client

    if engine:
        await engine.dispose()
    if mongo_client:
        mongo_client.close()
    if redis_client:
        await redis_client.aclose()


async def get_db() -> AsyncSession:
    async with async_session_factory() as session:
        yield session


async def get_mongo():
    return mongo_client[settings.MONGO_DATABASE]


async def get_redis():
    return redis_client
