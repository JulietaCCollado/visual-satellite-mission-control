# VSMC Backend

FastAPI service that fetches live TLE data from CelesTrak and exposes satellite positions.

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Then open <http://127.0.0.1:8000/docs> for the interactive API docs.

## Try it

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/satellites | jq '.[0:3]'
curl http://127.0.0.1:8000/api/satellites/25544/position | jq
curl http://127.0.0.1:8000/api/satellites/positions | jq '.count, .positions[0]'
```

## Tests

```bash
pytest -v
```

Tests stub out the network — no calls to CelesTrak during testing.

## Configuration

All env vars are prefixed `VSMC_`. See `app/config.py` for the full list.

| Variable | Default | Purpose |
|---|---|---|
| `VSMC_TLE_URL` | CelesTrak active group | Where TLEs are fetched from |
| `VSMC_TLE_CACHE_TTL_SECONDS` | 21600 (6h) | How long to cache TLEs |
| `VSMC_MAX_SATELLITES` | 100 | Cap on satellites returned |
| `VSMC_CORS_ORIGINS` | localhost:3000 | Allowed frontend origins |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/satellites` | List tracked satellites |
| GET | `/api/satellites/{norad_id}` | One satellite's metadata |
| GET | `/api/satellites/{norad_id}/position` | Live position of one |
| GET | `/api/satellites/positions` | Live positions of all |

## Docker

```bash
docker build -t vsmc-backend .
docker run -p 8000:8000 vsmc-backend
```
