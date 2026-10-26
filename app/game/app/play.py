from app import db as database
from app.envelope import event
from app.service import GameError, harvest_tree, plant_seed, unlock_plot, water_tree


def _ok(kind: str, request_id: str | None, message: str, data):
    return event(
        kind, request_id, {"isSuccess": True, "message": message, "data": data}
    )


def _error(request_id: str | None, message: str):
    return event(
        "error", request_id, {"isSuccess": False, "message": message, "data": None}
    )


def _water(db, user_id: str, message: dict):
    state = water_tree(db, user_id, str(message.get("treeId")))
    return "garden", "Your plant has been watered", state


def _harvest(db, user_id: str, message: dict):
    reward = harvest_tree(db, user_id, str(message.get("treeId")))
    return "reward", "Harvest gathered", reward


def _plant(db, user_id: str, message: dict):
    state = plant_seed(
        db,
        user_id,
        str(message.get("species")),
        int(message.get("plotIndex")),
        message.get("nickname"),
    )
    return "garden", "Seed planted in your forest", state


def _unlock(db, user_id: str, message: dict):
    state = unlock_plot(db, user_id, int(message.get("plotIndex")))
    return "garden", "New land plot unlocked", state


ACTIONS = {
    "water": _water,
    "harvest": _harvest,
    "plant": _plant,
    "unlock": _unlock,
}


def play_message(user_id: str, message: dict) -> dict:
    """Play one garden action and return the socket event."""
    request_id = message.get("requestId")
    handler = ACTIONS.get(message.get("action"))
    if handler is None:
        return _error(request_id, "Unknown garden action")
    db = database.SessionLocal()
    try:
        kind, text, payload = handler(db, user_id, message)
        return _ok(kind, request_id, text, payload.model_dump(by_alias=True))
    except GameError as exc:
        db.rollback()
        return _error(request_id, exc.message)
    except (TypeError, ValueError):
        db.rollback()
        return _error(request_id, "Could not play that action")
    finally:
        db.close()
