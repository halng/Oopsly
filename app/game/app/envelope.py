"""Response shapes shared by the HTTP routes and the garden socket."""


def ok(message: str, data):
    return {"isSuccess": True, "message": message, "data": data}


def failure(message: str):
    return {"isSuccess": False, "message": message, "data": None}


def event(kind: str, request_id: str | None, body: dict) -> dict:
    return {"type": kind, "requestId": request_id, **body}
