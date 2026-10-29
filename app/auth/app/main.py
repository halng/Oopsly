import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException

from app.config import settings
from app.deps import get_key_store
from app.envelope import ApiError, respond
from app.keys import rotation_loop
from app.logging_config import (
    mask_headers,
    request_id,
    request_platform,
    setup_logging,
)
from app.routes import CONTEXT_PATH, root_router, router

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Resolved through the overrides so tests can swap the key store.
    keys = app.dependency_overrides.get(get_key_store, get_key_store)()
    await asyncio.to_thread(keys.rotate_if_due)
    task = asyncio.create_task(
        rotation_loop(keys, settings.jwt_key_rotation_check_seconds)
    )
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(
    title="Oopsly Auth",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=f"{CONTEXT_PATH}/docs",
    openapi_url=f"{CONTEXT_PATH}/openapi.json",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(root_router)
app.include_router(router)


@app.middleware("http")
async def log_request(request: Request, call_next):
    """Same line as the API's LoggingConfig, with X-Request-ID / X-Platform bound."""
    platform = request_platform.set(request.headers.get("x-platform", ""))
    identifier = request_id.set(
        request.headers.get("x-request-id") or str(uuid.uuid4())
    )
    started = time.monotonic()
    method, path = request.method, request.url.path
    try:
        response = await call_next(request)
    except Exception as exc:
        elapsed = int((time.monotonic() - started) * 1000)
        logger.error(
            "Request: %s %s | Failed after %d ms | Error: %s",
            method,
            path,
            elapsed,
            exc,
            exc_info=exc,
        )
        raise
    else:
        elapsed = int((time.monotonic() - started) * 1000)
        if response.status_code >= 400:
            # Rejected requests carry their (masked) headers so a 401/403 can be
            # diagnosed from the log alone.
            logger.info(
                "Request: %s %s | Status: %d | %d ms | Headers: %s",
                method,
                path,
                response.status_code,
                elapsed,
                mask_headers(request.headers),
            )
        else:
            logger.info(
                "Request: %s %s | Status: %d | %d ms",
                method,
                path,
                response.status_code,
                elapsed,
            )
        return response
    finally:
        request_platform.reset(platform)
        request_id.reset(identifier)


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return respond(exc.status, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, __: RequestValidationError):
    return respond(400, "Invalid request body")


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return respond(exc.status_code, message)


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, __: Exception):
    # Already logged with its stack trace by log_request.
    return respond(500, "Internal server error")
