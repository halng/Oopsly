# Stage 1: resolve dependencies from uv.lock into a virtualenv.
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /code
# Only the manifests are copied here so this layer stays cached until the
# dependencies change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Stage 2: the virtualenv and the source, nothing else.
FROM python:3.12-slim

LABEL org.opencontainers.image.description="Oopsly garden game service"

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=9008
WORKDIR /code

RUN useradd --system --no-create-home appuser
COPY --from=build /opt/venv /opt/venv
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
USER appuser

EXPOSE 9008

# Exec form (FastAPI docs): `exec` makes uvicorn PID 1 so it receives SIGTERM.
# --proxy-headers because API Gateway / the load balancer sits in front.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
