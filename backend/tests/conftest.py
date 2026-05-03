"""Shared pytest fixtures."""
import pytest

# Real ISS TLE from CelesTrak (specific epoch). Skyfield will happily propagate
# this even if the epoch is years old — it just means lower accuracy. For unit
# tests, accuracy doesn't matter; we just need lat/lon/alt to be plausible.
SAMPLE_TLE_TEXT = """\
ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00012345  00000-0  22344-3 0  9999
2 25544  51.6400 100.0000 0001234  90.0000 270.0000 15.50000000123456
GPS BIIR-2  (PRN 13)
1 24876U 97035A   24001.50000000 -.00000050  00000-0  00000+0 0  9999
2 24876  55.4321  10.0000 0050000 200.0000 160.0000  2.00565000000000
STARLINK-1007
1 44713U 19074A   24001.50000000  .00001000  00000-0  70000-4 0  9999
2 44713  53.0500 200.0000 0001000  90.0000 270.0000 15.06400000000000
"""


@pytest.fixture
def sample_tle_text() -> str:
    return SAMPLE_TLE_TEXT
