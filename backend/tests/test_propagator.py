"""Unit tests for orbit propagation.

We don't validate exact positions (those depend on epoch); we just check
that Skyfield is wired up correctly and produces physically plausible numbers.
"""
from datetime import datetime, timezone

from app.core.propagator import propagate, propagate_many
from app.core.tle_loader import parse_tle_text


def _iss_record(sample_tle_text):
    records = parse_tle_text(sample_tle_text)
    return next(r for r in records if r.norad_id == 25544)


def test_propagate_iss_has_plausible_altitude(sample_tle_text):
    record = _iss_record(sample_tle_text)
    pos = propagate(record, datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc))

    # ISS orbits 380-420 km up. Allow generous slack since our TLE epoch may
    # be old, but it should still be in low Earth orbit.
    assert 200 < pos.altitude_km < 800


def test_propagate_iss_has_plausible_velocity(sample_tle_text):
    record = _iss_record(sample_tle_text)
    pos = propagate(record, datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc))

    # LEO orbital velocity is ~7.6 km/s. Wide bounds for safety.
    assert 6.0 < (pos.velocity_kms or 0) < 9.0


def test_propagate_returns_geodetic_coords_in_range(sample_tle_text):
    record = _iss_record(sample_tle_text)
    pos = propagate(record, datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc))
    assert -90 <= pos.latitude_deg <= 90
    assert -180 <= pos.longitude_deg <= 180


def test_propagate_many_matches_individual(sample_tle_text):
    records = parse_tle_text(sample_tle_text)
    when = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)

    bulk = propagate_many(records, when)
    assert len(bulk) == len(records)

    individual = [propagate(r, when) for r in records]
    for b, i in zip(bulk, individual, strict=True):
        assert b.latitude_deg == i.latitude_deg
        assert b.longitude_deg == i.longitude_deg
