"""Pydantic response models for the public API."""
from datetime import datetime

from pydantic import BaseModel, Field


class Satellite(BaseModel):
    """Static info about a satellite (from its TLE)."""

    norad_id: int = Field(..., description="NORAD catalog number, unique per satellite")
    name: str = Field(..., description="Human-readable name from the TLE")
    category: str = Field(..., description="Category: iss, gps, starlink, weather, other")


class Position(BaseModel):
    """Computed position of a satellite at a specific instant."""

    norad_id: int
    name: str
    timestamp: datetime = Field(..., description="UTC time the position was computed for")

    # Geodetic coordinates: most useful for plotting on a globe.
    latitude_deg: float = Field(..., ge=-90, le=90)
    longitude_deg: float = Field(..., ge=-180, le=180)
    altitude_km: float = Field(..., ge=0)

    # Optional ECI velocity magnitude — handy for the UI to show "27,600 km/h".
    velocity_kms: float | None = None


class PositionList(BaseModel):
    """Bulk response for /satellites/positions."""

    timestamp: datetime
    count: int
    positions: list[Position]
