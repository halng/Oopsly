from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import request_id, request_platform, setup_logging
from app.routes import router
from app.service import GameError
from app.socket import socket_router

setup_logging()

app = FastAPI(title="Oopsly Game", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(socket_router)


@app.middleware("http")
async def bind_request_context(request: Request, call_next):
    platform = request_platform.set(request.headers.get("x-platform", ""))
    identifier = request_id.set(request.headers.get("x-request-id", ""))
    try:
        return await call_next(request)
    finally:
        request_platform.reset(platform)
        request_id.reset(identifier)


@app.exception_handler(GameError)
async def game_error_handler(_: Request, exc: GameError):
    return JSONResponse(
        status_code=400,
        content={"isSuccess": False, "message": exc.message, "data": None},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content={"isSuccess": False, "message": message, "data": None},
    )


@app.get("/health")
def health():
    return {"isSuccess": True, "message": "ok", "data": None}
