from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, close_db
from app.routers import auth, presentations, api_keys


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="AI Slides Builder",
    description="Transform Markdown into beautiful presentations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(
    presentations.router, prefix="/presentations", tags=["presentations"]
)
app.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
