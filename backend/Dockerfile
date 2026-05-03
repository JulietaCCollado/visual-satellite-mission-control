FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install only what we need at runtime
COPY pyproject.toml ./
RUN pip install --upgrade pip && \
    pip install "fastapi>=0.115.0" "uvicorn[standard]>=0.32.0" \
                "httpx>=0.27.0" "skyfield>=1.49" "sgp4>=2.23" \
                "pydantic>=2.9.0" "pydantic-settings>=2.6.0" \
                "python-dateutil>=2.9.0"

COPY app ./app

EXPOSE 8000

# Pre-download Skyfield data files at build time so first request is fast.
RUN python -c "from skyfield.api import load; load.timescale(builtin=True)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
