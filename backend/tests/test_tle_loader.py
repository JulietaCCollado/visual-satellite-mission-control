"""Unit tests for the TLE loader."""
import pytest

from app.config import Settings
from app.core.tle_loader import TLECache, curate, parse_tle_text


def test_parse_tle_text_returns_three_records(sample_tle_text):
    records = parse_tle_text(sample_tle_text)
    assert len(records) == 3
    norad_ids = {r.norad_id for r in records}
    assert norad_ids == {25544, 24876, 44713}


def test_parse_tle_assigns_categories(sample_tle_text):
    records = parse_tle_text(sample_tle_text)
    by_id = {r.norad_id: r for r in records}
    assert by_id[25544].category == "iss"          # curated
    assert by_id[24876].category == "other"        # not in our curated GPS list
    assert by_id[44713].category == "starlink"     # name-based


def test_parse_skips_malformed():
    text = "BAD SAT\nnot a tle line\nanother bad line\n"
    assert parse_tle_text(text) == []


def test_curate_picks_curated_first_then_starlink(sample_tle_text):
    records = parse_tle_text(sample_tle_text)
    chosen = curate(records, max_satellites=2)
    # ISS must come first (it's in CURATED_NORAD_IDS), Starlink next.
    assert chosen[0].norad_id == 25544
    assert chosen[1].category == "starlink"


@pytest.mark.asyncio
async def test_cache_calls_http_only_once(sample_tle_text, mocker):
    """Two concurrent reads should result in a single network call."""
    settings = Settings()
    cache = TLECache(settings)

    mock_resp = mocker.MagicMock()
    mock_resp.text = sample_tle_text
    mock_resp.raise_for_status = mocker.MagicMock()

    mock_client = mocker.AsyncMock()
    mock_client.get = mocker.AsyncMock(return_value=mock_resp)
    mock_client.aclose = mocker.AsyncMock()

    import asyncio
    r1, r2 = await asyncio.gather(
        cache.get_records(client=mock_client),
        cache.get_records(client=mock_client),
    )

    assert r1 is r2  # same cached list
    assert mock_client.get.await_count == 1


@pytest.mark.asyncio
async def test_cache_get_by_id(sample_tle_text, mocker):
    settings = Settings()
    cache = TLECache(settings)

    mock_resp = mocker.MagicMock()
    mock_resp.text = sample_tle_text
    mock_resp.raise_for_status = mocker.MagicMock()
    mock_client = mocker.AsyncMock()
    mock_client.get = mocker.AsyncMock(return_value=mock_resp)
    mock_client.aclose = mocker.AsyncMock()

    # Seed via get_records first since get_by_id calls it internally.
    await cache.get_records(client=mock_client)
    record = await cache.get_by_id(25544)
    assert record is not None
    assert record.name.startswith("ISS")

    missing = await cache.get_by_id(99999)
    assert missing is None
