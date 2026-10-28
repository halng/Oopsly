"""Response envelope shared with the Java API: isSuccess, timestamp, message,
statusCode, data."""

from datetime import UTC, datetime

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """An expected failure carrying the HTTP status to answer with."""

    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def bad_request(message: str) -> ApiError:
    return ApiError(400, message)


def unauthorized(message: str) -> ApiError:
    return ApiError(401, message)


def forbidden(message: str) -> ApiError:
    return ApiError(403, message)


def not_found(message: str) -> ApiError:
    return ApiError(404, message)


def respond(status: int, message: str, data=None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content=jsonable_encoder(
            {
                "isSuccess": status < 400,
                "timestamp": datetime.now(UTC),
                "message": message,
                "statusCode": status,
                "data": data,
            }
        ),
    )


def ok(message: str, data=None) -> JSONResponse:
    return respond(200, message, data)
