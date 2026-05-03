"""HTTP routes for satellite data."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.propagator import propagate, propagate_many
from app.core.tle_loader import TLECache
from app.models.schemas import Position, PositionList, Satellite

router = APIRouter(prefix="/satellites", tags=["satellites"])


def get_tle_cache(request: Request) -> TLECache:
    """FastAPI dependency that pulls the TLECache off the app state.

    The cache is built once at startup (see app.main) so it's shared across
    all requests.
    """
    return request.app.state.tle_cache


@router.get("", response_model=list[Satellite], summary="List all tracked satellites")
async def list_satellites(cache: TLECache = Depends(get_tle_cache)) -> list[Satellite]:
    records = await cache.get_records()
    return [
        Satellite(norad_id=r.norad_id, name=r.name, category=r.category)
        for r in records
    ]


@router.get(
    "/positions",
    response_model=PositionList,
    summary="Bulk-fetch current positions for all tracked satellites",
)
async def all_positions(cache: TLECache = Depends(get_tle_cache)) -> PositionList:
    records = await cache.get_records()
    now = datetime.now(timezone.utc)
    positions = propagate_many(records, now)
    return PositionList(timestamp=now, count=len(positions), positions=positions)


@router.get("/{norad_id}", response_model=Satellite, summary="Get one satellite's metadata")
async def get_satellite(norad_id: int, cache: TLECache = Depends(get_tle_cache)) -> Satellite:
    record = await cache.get_by_id(norad_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not tracked")
    return Satellite(norad_id=record.norad_id, name=record.name, category=record.category)


@router.get(
    "/{norad_id}/position",
    response_model=Position,
    summary="Get current position of one satellite",
)
async def get_position(
    norad_id: int,
    cache: TLECache = Depends(get_tle_cache),
) -> Position:
    record = await cache.get_by_id(norad_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Satellite {norad_id} not tracked")
    return propagate(record)
