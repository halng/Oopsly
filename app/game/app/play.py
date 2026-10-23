from app import db as database
from app.service import GameError, harvest_tree, plant_seed, unlock_plot, water_tree


def _ok(kind: str, request_id: str | None, message: str, data):
    return {
        "type": kind,
        "requestId": request_id,
        "isSuccess": True,
        "message": message,
        "data": data,
    }


def _error(request_id: str | None, message: str):
    return {
        "type": "error",
        "requestId": request_id,
        "isSuccess": False,
        "message": message,
        "data": None,
    }


def play_message(user_id: str, message: dict) -> dict:
    """Play one garden action and return the socket event."""
    request_id = message.get("requestId")
    action = message.get("action")
    db = database.SessionLocal()
    try:
        if action == "water":
            state = water_tree(db, user_id, str(message.get("treeId")))
            return _ok(
                "garden",
                request_id,
                "Your plant has been watered",
                state.model_dump(by_alias=True),
            )
        if action == "harvest":
            reward = harvest_tree(db, user_id, str(message.get("treeId")))
            return _ok(
                "reward",
                request_id,
                "Harvest gathered",
                reward.model_dump(by_alias=True),
            )
        if action == "plant":
            state = plant_seed(
                db,
                user_id,
                str(message.get("species")),
                int(message.get("plotIndex")),
                message.get("nickname"),
            )
            return _ok(
                "garden",
                request_id,
                "Seed planted in your forest",
                state.model_dump(by_alias=True),
            )
        if action == "unlock":
            state = unlock_plot(db, user_id, int(message.get("plotIndex")))
            return _ok(
                "garden",
                request_id,
                "New land plot unlocked",
                state.model_dump(by_alias=True),
            )
        return _error(request_id, "Unknown garden action")
    except GameError as exc:
        db.rollback()
        return _error(request_id, exc.message)
    except (TypeError, ValueError):
        db.rollback()
        return _error(request_id, "Could not play that action")
    finally:
        db.close()
