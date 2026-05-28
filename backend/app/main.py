from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.memory.store import MemoryStore
from app.rag.indexer import ensure_vector_index

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("faithassist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await MemoryStore(settings.database_url).initialize()
    try:
        ensure_vector_index()
    except Exception:
        logger.exception("Vector index initialization failed")
    yield


app = FastAPI(
    title="FaithAssist AI API",
    version="0.1.0",
    description="Christianity-focused grounded assistant with RAG, safety, memory, and image generation.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
