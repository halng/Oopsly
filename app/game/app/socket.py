import logging

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth import verify_access_token
from app.logging_config import request_id, request_platform
from app.play import play_message

socket_router = APIRouter()
logger = logging.getLogger("app.socket")


@socket_router.websocket("/v1/game/ws")
async def game_socket(websocket: WebSocket):
    platform = request_platform.set(
        websocket.headers.get("x-platform")
        or websocket.query_params.get("platform")
        or ""
    )
    identifier = request_id.set(
        websocket.headers.get("x-request-id")
        or websocket.query_params.get("requestId")
        or ""
    )
    token = websocket.query_params.get("token")
    await websocket.accept()
    try:
        try:
            auth = verify_access_token(token or "")
        except (jwt.PyJWTError, ValueError) as exc:
            logger.warning(
                "JWT authentication failed with exception %s and message: %s",
                type(exc).__name__,
                exc,
            )
            await websocket.send_json(
                {
                    "type": "error",
                    "requestId": None,
                    "isSuccess": False,
                    "message": "You must be logged in",
                    "data": None,
                }
            )
            await websocket.close(code=4401)
            return

        logger.info("User %s authenticated with role %s", auth.user_id, auth.role)
        await websocket.send_json(
            {
                "type": "ready",
                "requestId": None,
                "isSuccess": True,
                "message": "Garden socket open",
                "data": auth.as_dict(),
            }
        )
        while True:
            message = await websocket.receive_json()
            await websocket.send_json(play_message(auth.user_id, message))
    except WebSocketDisconnect:
        return
    finally:
        request_platform.reset(platform)
        request_id.reset(identifier)
