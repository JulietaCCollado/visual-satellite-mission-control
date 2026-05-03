"""Compute satellite positions from TLEs using Skyfield (which wraps SGP4).

Why Skyfield over raw sgp4: Skyfield handles time scales (UTC vs TT vs UT1),
geodetic conversions (ECI -> lat/lon/alt on the WGS84 ellipsoid), and reference
frames correctly. Doing this by hand is a great way to be off by 100 km.

Skyfield is fast: ~10 microseconds per propagation per satellite, so propagating
all 100 sats at once is well under a millisecond.
"""
from __future__ import annotations

from datetime import datetime, timezone

from skyfield.api import EarthSatellite, load, wgs84

from app.core.tle_loader import TLERecord
from app.models.schemas import Position

# Skyfield needs a timescale object. `load.timescale(builtin=True)` uses the
# bundled leap-second tables — no network call, no surprises.
_TS = load.timescale(builtin=True)


def _to_earth_sat(record: TLERecord) -> EarthSatellite:
    """Build a Skyfield EarthSatellite from a TLE record."""
    return EarthSatellite(record.line1, record.line2, record.name, _TS)


def propagate(record: TLERecord, when: datetime | None = None) -> Position:
    """Compute the position of a single satellite at a given UTC time.

    Args:
        record: TLE record to propagate.
        when: UTC timestamp (defaults to now).

    Returns:
        Position with geodetic lat/lon/alt and velocity magnitude.
    """
    when = when or datetime.now(timezone.utc)
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)

    sat = _to_earth_sat(record)
    t = _TS.from_datetime(when)

    geocentric = sat.at(t)
    subpoint = wgs84.subpoint_of(geocentric)
    altitude_km = wgs84.height_of(geocentric).km

    # Velocity: the geocentric.velocity.km_per_s is a 3-vector in ECI (km/s).
    # We report its magnitude — direction is rarely useful for the UI.
    vx, vy, vz = geocentric.velocity.km_per_s
    velocity_kms = float((vx * vx + vy * vy + vz * vz) ** 0.5)

    return Position(
        norad_id=record.norad_id,
        name=record.name,
        timestamp=when,
        latitude_deg=float(subpoint.latitude.degrees),
        longitude_deg=float(subpoint.longitude.degrees),
        altitude_km=float(altitude_km),
        velocity_kms=velocity_kms,
    )


def propagate_many(records: list[TLERecord], when: datetime | None = None) -> list[Position]:
    """Compute positions for many satellites at the same instant.

    Currently a simple loop. If we ever scale to thousands of sats, we can
    vectorize by passing all sats to Skyfield at once via a satellite array.
    """
    when = when or datetime.now(timezone.utc)
    return [propagate(r, when) for r in records]
