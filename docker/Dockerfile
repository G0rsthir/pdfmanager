# Build frontend
FROM node:26-alpine AS frontend-build

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build


# Build backend
FROM python:3.14-slim AS backend-build

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /build

COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

## Install the project itself
COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-editable



# Runtime
FROM python:3.14-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx supervisor && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default && \
    sed -i '/^user /d' /etc/nginx/nginx.conf

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY --from=backend-build /opt/venv /opt/venv
COPY --from=frontend-build /build/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/app.conf

WORKDIR /app

## Storage volume
RUN mkdir -p /app/storage
VOLUME /app/storage

RUN useradd --create-home appuser && \
    chown -R appuser:appuser /app /var/log/nginx /var/lib/nginx /run

USER appuser

EXPOSE 8080

CMD ["supervisord", "-n", "-c", "/etc/supervisor/conf.d/app.conf"]
