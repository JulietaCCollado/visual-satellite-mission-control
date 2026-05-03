"""Application configuration loaded from environment variables."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings loaded from env vars or `.env` file."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VSMC_", extra="ignore")

    # CelesTrak TLE sources, tried in order. CelesTrak's bot protection blocks
    # direct calls to gp.php with certain query strings, but the static
    # filename URLs (stations.txt, active.txt, etc.) get redirected to a
    # working gp.php variant. We list the static URLs because they actually
    # work — direct gp.php calls return 403.
    tle_urls: list[str] = [
        # The "active" group via the redirect path (~7000 sats)
        "https://celestrak.org/NORAD/elements/active.txt",
        # Big LEO constellations
        "https://celestrak.org/NORAD/elements/starlink.txt",
        "https://celestrak.org/NORAD/elements/gps-ops.txt",
        "https://celestrak.org/NORAD/elements/weather.txt",
        "https://celestrak.org/NORAD/elements/resource.txt",  # Earth observation
        "https://celestrak.org/NORAD/elements/science.txt",
        "https://celestrak.org/NORAD/elements/stations.txt",  # ISS, Tiangong
    ]

    # If True, fetch ALL sources in `tle_urls` and combine them, instead of
    # stopping at the first one that succeeds. This gets us the full mix of
    # categories (GPS + weather + Starlink + ...). Set to False to use the
    # legacy "first-success-wins" behavior.
    combine_tle_sources: bool = True

    # Kept for backwards compat with anyone setting VSMC_TLE_URL directly.
    tle_url: str | None = None

    # If True, fall back to bundled (stale) TLEs when all live sources fail.
    # Useful for offline/restricted-network development.
    use_fallback_tles: bool = True

    # If False, skip SSL certificate verification on outgoing requests.
    # Set to False on networks where revocation checks fail (corp AV, captive
    # portals, etc.). Default True.
    verify_ssl: bool = True

    # How long to cache TLEs before re-fetching (seconds). 6 hours is plenty —
    # TLEs are typically updated 1-2x per day per satellite.
    tle_cache_ttl_seconds: int = 6 * 60 * 60

    # Max satellites to expose via /satellites. Phase 1 default = 100.
    max_satellites: int = 100

    # CORS origins for the frontend. Comma-separated env var: VSMC_CORS_ORIGINS=...
    # Add your production frontend URL here, or set via env var on Render.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Regex pattern for CORS — useful for matching all Vercel preview URLs.
    # Set via env: VSMC_CORS_ORIGIN_REGEX="https://.*\\.vercel\\.app"
    cors_origin_regex: str | None = None

    # User agent string for outgoing requests to CelesTrak. We use a real
    # browser UA because CelesTrak is now behind a bot-protection layer that
    # 403s anything that looks like a scripting library.
    http_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/130.0.0.0 Safari/537.36"
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — call this from FastAPI dependencies."""
    return Settings()
