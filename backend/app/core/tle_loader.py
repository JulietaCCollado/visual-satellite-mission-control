"""Fetch and cache TLE (Two-Line Element) data from CelesTrak.

A TLE is a text format describing a satellite's orbit. CelesTrak distributes
TLEs in groups (e.g., "active", "stations", "starlink", "gps-ops"). We fetch
the "active" group and filter it down to ~100 interesting satellites for v1.

Design notes:
- We cache TLEs in memory for `tle_cache_ttl_seconds` (default 6h). TLEs are
  updated on the order of once or twice per day, so this is plenty fresh.
- We avoid hammering CelesTrak: one fetch covers all satellites at once.
- The curated list is hardcoded for now; later we can let users pick groups.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass

import httpx

from app.config import Settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class TLERecord:
    """A parsed TLE entry."""

    norad_id: int
    name: str
    line1: str
    line2: str
    category: str


# Curated list of ~100 satellites by NORAD ID. Mix of:
# - The ISS and other crewed/notable stations
# - A spread of GPS satellites
# - A sample of Starlink (huge constellation, 10 is enough for visual variety)
# - Major weather satellites (NOAA, GOES, Meteosat)
# - A few science/Earth observation satellites
#
# NORAD IDs are stable; if any specific sat is decommissioned we just skip it.
CURATED_NORAD_IDS: dict[int, str] = {
    # Stations
    25544: "iss",        # International Space Station (ZARYA)
    48274: "iss",        # CSS (Tiangong)
    # GPS (sample of operational birds)
    32711: "gps", 36585: "gps", 38833: "gps", 39166: "gps", 39741: "gps",
    40105: "gps", 40294: "gps", 40534: "gps", 41019: "gps", 41328: "gps",
    43873: "gps", 44506: "gps", 45854: "gps", 46826: "gps", 48859: "gps",
    # Weather
    25338: "weather",    # NOAA-15
    28654: "weather",    # NOAA-18
    33591: "weather",    # NOAA-19
    37849: "weather",    # SUOMI NPP
    43013: "weather",    # NOAA-20 (JPSS-1)
    54234: "weather",    # NOAA-21 (JPSS-2)
    29155: "weather",    # GOES-13
    35491: "weather",    # GOES-14
    36411: "weather",    # GOES-15
    41866: "weather",    # GOES-16
    43226: "weather",    # GOES-17
    51850: "weather",    # GOES-18
    38552: "weather",    # METEOSAT-10
    40732: "weather",    # METEOSAT-11
    # Earth observation / science
    27424: "science",    # AQUA
    25994: "science",    # TERRA
    39084: "science",    # LANDSAT-8
    49260: "science",    # LANDSAT-9
    40697: "science",    # SENTINEL-2A
    42063: "science",    # SENTINEL-2B
    41335: "science",    # SENTINEL-3A
    43437: "science",    # SENTINEL-3B
    27607: "science",    # SAUDISAT 1C (long-lived smallsat)
    39634: "science",    # SWARM A
    39452: "science",    # SWARM B
    39453: "science",    # SWARM C
    # Hubble & other notable
    20580: "science",    # HUBBLE SPACE TELESCOPE
}


# We pad the curated list with the first N Starlink satellites we encounter,
# so the globe looks alive. STARLINK_TARGET is how many we want.
STARLINK_TARGET = 60


def parse_tle_text(text: str) -> list[TLERecord]:
    """Parse a multi-satellite TLE blob into TLERecord objects.

    Format is repeating triplets of:
        <name line>
        <line 1>
        <line 2>
    """
    records: list[TLERecord] = []
    lines = [ln.rstrip() for ln in text.strip().splitlines() if ln.strip()]
    if len(lines) % 3 != 0:
        logger.warning("TLE text has %d lines (not divisible by 3); skipping tail", len(lines))

    for i in range(0, len(lines) - 2, 3):
        name = lines[i].strip()
        l1 = lines[i + 1]
        l2 = lines[i + 2]
        if not (l1.startswith("1 ") and l2.startswith("2 ")):
            continue
        try:
            norad_id = int(l1[2:7])
        except ValueError:
            continue

        category = _categorize(norad_id, name)
        records.append(TLERecord(norad_id=norad_id, name=name, line1=l1, line2=l2,
                                 category=category))
    return records


def _categorize(norad_id: int, name: str) -> str:
    if norad_id in CURATED_NORAD_IDS:
        return CURATED_NORAD_IDS[norad_id]
    upper = name.upper()
    if "STARLINK" in upper:
        return "starlink"
    if "ONEWEB" in upper:
        return "comms"
    return "other"


def curate(records: list[TLERecord], max_satellites: int) -> list[TLERecord]:
    """Pick the ~100 satellites we want to expose to the frontend.

    Strategy: take all curated NORAD IDs we found, then pad with Starlink up
    to `max_satellites`.
    """
    by_id = {r.norad_id: r for r in records}

    chosen: list[TLERecord] = []
    seen: set[int] = set()

    # First, the curated list (in dict order)
    for norad_id in CURATED_NORAD_IDS:
        if norad_id in by_id:
            chosen.append(by_id[norad_id])
            seen.add(norad_id)

    # Then, Starlink padding
    starlink_added = 0
    for r in records:
        if r.category == "starlink" and r.norad_id not in seen:
            chosen.append(r)
            seen.add(r.norad_id)
            starlink_added += 1
            if starlink_added >= STARLINK_TARGET:
                break

    # Hard cap
    return chosen[:max_satellites]


class TLECache:
    """In-memory TTL cache around the curated TLE list.

    Async-safe via a single lock so concurrent requests during a refresh
    don't all hit CelesTrak.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._records: list[TLERecord] = []
        self._fetched_at: float = 0.0
        self._lock = asyncio.Lock()

    def _is_fresh(self) -> bool:
        return (
            self._records
            and (time.monotonic() - self._fetched_at) < self._settings.tle_cache_ttl_seconds
        )

    async def _fetch_from_source(self, client: httpx.AsyncClient, url: str) -> str:
        """Fetch TLE text from a single URL. Raises on HTTP errors."""
        logger.info("Fetching TLEs from %s", url)
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text

    async def get_records(self, client: httpx.AsyncClient | None = None) -> list[TLERecord]:
        if self._is_fresh():
            return self._records

        async with self._lock:
            # Double-check after acquiring the lock — another caller may have
            # refreshed while we were waiting.
            if self._is_fresh():
                return self._records

            owns_client = client is None
            client = client or httpx.AsyncClient(
                headers={
                    "User-Agent": self._settings.http_user_agent,
                    "Accept": "text/plain,text/html,application/xhtml+xml,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
                timeout=30.0,
                follow_redirects=True,
                verify=self._settings.verify_ssl,
            )
            try:
                # Build the list of URLs to try: the legacy single-URL setting
                # takes precedence if set, otherwise we walk through tle_urls.
                urls = (
                    [self._settings.tle_url]
                    if self._settings.tle_url
                    else list(self._settings.tle_urls)
                )

                last_error: Exception | None = None
                combined_text_parts: list[str] = []
                for url in urls:
                    try:
                        chunk = await self._fetch_from_source(client, url)
                        combined_text_parts.append(chunk)
                        if not self._settings.combine_tle_sources:
                            break
                    except Exception as exc:
                        logger.warning("TLE source %s failed: %s", url, exc)
                        last_error = exc

                if not combined_text_parts:
                    if self._settings.use_fallback_tles:
                        from app.core.fallback_tle import FALLBACK_TLE_TEXT
                        logger.warning(
                            "All live TLE sources failed; using bundled fallback "
                            "(positions will be inaccurate). Last error: %s",
                            last_error,
                        )
                        combined_text_parts.append(FALLBACK_TLE_TEXT)
                    else:
                        assert last_error is not None
                        raise last_error

                text = "\n".join(combined_text_parts)
                all_records = parse_tle_text(text)
                # Dedupe: same satellite can appear in multiple groups
                # (e.g. NOAA-19 in both "weather" and "active").
                seen: set[int] = set()
                deduped: list[TLERecord] = []
                for r in all_records:
                    if r.norad_id not in seen:
                        seen.add(r.norad_id)
                        deduped.append(r)
                logger.info(
                    "Parsed %d TLE records (%d unique) from %d source(s)",
                    len(all_records), len(deduped), len(combined_text_parts),
                )
                self._records = curate(deduped, self._settings.max_satellites)
                self._fetched_at = time.monotonic()
                logger.info("Curated down to %d satellites", len(self._records))
            finally:
                if owns_client:
                    await client.aclose()

        return self._records

    async def get_by_id(self, norad_id: int) -> TLERecord | None:
        records = await self.get_records()
        for r in records:
            if r.norad_id == norad_id:
                return r
        return None
