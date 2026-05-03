"""End-to-end API tests with a stubbed TLE source."""
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(sample_tle_text, mocker):
    """Build the app, then override the TLE cache to use our sample blob."""
    # We need to patch httpx.AsyncClient so that the real lifespan startup
    # doesn't hit the network. We do this by patching at the source.
    mock_resp = MagicMock()
    mock_resp.text = sample_tle_text
    mock_resp.raise_for_status = MagicMock()

    mock_async_client = AsyncMock()
    mock_async_client.get = AsyncMock(return_value=mock_resp)
    mock_async_client.aclose = AsyncMock()
    mock_async_client.__aenter__ = AsyncMock(return_value=mock_async_client)
    mock_async_client.__aexit__ = AsyncMock(return_value=None)

    mocker.patch(
        "app.core.tle_loader.httpx.AsyncClient",
        return_value=mock_async_client,
    )

    app = create_app()
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_satellites(client):
    r = client.get("/api/satellites")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Our sample has ISS + 1 GPS + 1 Starlink, but only ISS and Starlink
    # survive curation (the GPS one isn't in our curated list).
    norad_ids = {s["norad_id"] for s in data}
    assert 25544 in norad_ids


def test_get_satellite_by_id(client):
    r = client.get("/api/satellites/25544")
    assert r.status_code == 200
    assert r.json()["norad_id"] == 25544
    assert r.json()["category"] == "iss"


def test_get_satellite_404(client):
    r = client.get("/api/satellites/12345")
    assert r.status_code == 404


def test_get_position(client):
    r = client.get("/api/satellites/25544/position")
    assert r.status_code == 200
    body = r.json()
    assert body["norad_id"] == 25544
    assert -90 <= body["latitude_deg"] <= 90
    assert -180 <= body["longitude_deg"] <= 180
    assert body["altitude_km"] > 0


def test_bulk_positions(client):
    r = client.get("/api/satellites/positions")
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == len(body["positions"])
    assert body["count"] >= 1
    for p in body["positions"]:
        assert -90 <= p["latitude_deg"] <= 90
