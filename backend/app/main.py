"""FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import satellites
from app.config import get_settings
from app.core.tle_loader import TLECache

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run once at startup, once at shutdown.

    We build the TLECache here and stash it on app.state so all routes
    can grab it via Depends(get_tle_cache).
    """
    settings = get_settings()
    app.state.settings = settings
    app.state.tle_cache = TLECache(settings)

    # Warm the cache so the first user request is fast. If this fails (network
    # blip, CelesTrak down) we still start up — the next request will retry.
    try:
        await app.state.tle_cache.get_records()
    except Exception:
        logging.exception("Initial TLE fetch failed; will retry on first request")

    yield

    # No teardown needed for in-memory cache.


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Visual Satellite Mission Control API",
        version="0.1.0",
        description="Live satellite positions and pass predictions.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(satellites.router, prefix="/api")

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
