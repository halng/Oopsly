import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth import verify_access_token
from app.play import play_message

socket_router = APIRouter()


@socket_router.websocket("/v1/game/ws")
async def game_socket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    await websocket.accept()
    try:
        auth = verify_access_token(token or "")
    except (jwt.PyJWTError, ValueError):
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

    await websocket.send_json(
        {
            "type": "ready",
            "requestId": None,
            "isSuccess": True,
            "message": "Garden socket open",
            "data": auth.as_dict(),
        }
    )
    try:
        while True:
            message = await websocket.receive_json()
            await websocket.send_json(play_message(auth.user_id, message))
    except WebSocketDisconnect:
        return
