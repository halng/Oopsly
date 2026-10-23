import time

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.auth import signing_key
from app.main import app
from app.models import Tree


def test_missing_token_is_rejected(session_factory):
    with TestClient(app) as test_client:
        response = test_client.get("/v1/game/garden")
    assert response.status_code == 401


def test_valid_access_token_opens_a_starter_garden(session_factory):
    token = jwt.encode(
        {"id": "user-9", "sub": "learner@oopsly.app", "exp": int(time.time()) + 60},
        signing_key(),
        algorithm="HS256",
    )
    with TestClient(app) as test_client:
        response = test_client.get(
            "/v1/game/garden",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200
    garden = response.json()["data"]
    assert len(garden["plots"]) == 9
    assert sum(1 for plot in garden["plots"] if plot["isUnlocked"]) == 3
    assert garden["seedInventory"]["camphor_tree"] == 1
    assert garden["dewDrops"] == 10


def test_focus_review_and_test_each_add_one_seed(client, monkeypatch):
    monkeypatch.setattr("app.service._roll_unit", lambda: 0.0)
    focus = client.post("/v1/game/rewards/focus", json={"focusMinutes": 45})
    assert focus.status_code == 200
    body = focus.json()["data"]
    assert body["species"] == "wildflower_meadow"
    assert body["rarity"] == "Common"
    assert body["dewDropsGained"] == 10
    assert body["growthPointsGained"] == 90
    assert body["garden"]["seedInventory"]["wildflower_meadow"] == 1
    assert body["garden"]["totalFocusMinutes"] == 45

    review = client.post(
        "/v1/game/rewards/review",
        json={"cardsReviewed": 4, "again": 0, "hard": 0, "good": 1, "easy": 2},
    )
    assert review.json()["data"]["garden"]["seedInventory"]["wildflower_meadow"] == 2

    test = client.post("/v1/game/rewards/test", json={"percentage": 92})
    assert test.json()["data"]["garden"]["seedInventory"]["wildflower_meadow"] == 3


def test_plant_water_and_harvest(client, session_factory):
    planted = client.post(
        "/v1/game/plants",
        json={"species": "camphor_tree", "plotIndex": 0, "nickname": "Totoro"},
    )
    assert planted.status_code == 200
    garden = planted.json()["data"]
    assert garden["seedInventory"]["camphor_tree"] == 0
    tree = garden["plantedTrees"][0]
    assert tree["species"] == "camphor_tree"
    assert tree["nickname"] == "Totoro"

    watered = client.post("/v1/game/plants/water", json={"treeId": tree["id"]})
    assert watered.status_code == 200
    watered_tree = watered.json()["data"]["plantedTrees"][0]
    assert watered_tree["waterLevel"] == 75
    assert watered_tree["growthProgress"] == 10
    assert watered.json()["data"]["dewDrops"] == 5

    dry = client.post("/v1/game/plants/water", json={"treeId": tree["id"]})
    assert dry.status_code == 200
    empty = client.post("/v1/game/plants/water", json={"treeId": tree["id"]})
    assert empty.status_code == 400
    assert empty.json()["message"] == "Not enough dew drops to water"

    early = client.post("/v1/game/plants/harvest", json={"treeId": tree["id"]})
    assert early.status_code == 400
    assert early.json()["message"] == "This plant is not ready to harvest"

    db = session_factory()
    stored = db.scalar(select(Tree).where(Tree.id == tree["id"]))
    stored.stage = "blooming"
    db.commit()
    db.close()

    harvest = client.post("/v1/game/plants/harvest", json={"treeId": tree["id"]})
    assert harvest.status_code == 200
    reward = harvest.json()["data"]
    assert reward["species"] == "camphor_tree"
    assert reward["dewDropsGained"] == 5
    assert reward["forestCoinsGained"] == 40
    assert reward["xpGained"] == 120
    assert reward["garden"]["plantedTrees"] == []
    assert reward["garden"]["plots"][0]["plantId"] is None


def test_ancient_harvest_pays_double(client, session_factory):
    planted = client.post("/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 1})
    tree_id = planted.json()["data"]["plantedTrees"][0]["id"]
    db = session_factory()
    stored = db.scalar(select(Tree).where(Tree.id == tree_id))
    stored.stage = "ancient"
    db.commit()
    db.close()

    harvest = client.post("/v1/game/plants/harvest", json={"treeId": tree_id})
    reward = harvest.json()["data"]
    assert reward["dewDropsGained"] == 10
    assert reward["forestCoinsGained"] == 80
    assert reward["xpGained"] == 240


def test_locked_plot_needs_coins(client, session_factory):
    locked = client.post("/v1/game/plots/unlock", json={"plotIndex": 3})
    assert locked.status_code == 400

    db = session_factory()
    from app.models import Garden

    garden = db.scalar(select(Garden).where(Garden.user_id == "user-1"))
    garden.forest_coins = 50
    db.commit()
    db.close()

    opened = client.post("/v1/game/plots/unlock", json={"plotIndex": 3})
    assert opened.status_code == 200
    plot = next(item for item in opened.json()["data"]["plots"] if item["index"] == 3)
    assert plot["isUnlocked"] is True
    assert opened.json()["data"]["forestCoins"] == 0


def test_socket_waters_and_rejects_a_second_pour_without_dew(client):
    planted = client.post("/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 0})
    tree_id = planted.json()["data"]["plantedTrees"][0]["id"]
    token = jwt.encode(
        {"id": "user-1", "sub": "learner@oopsly.app", "exp": int(time.time()) + 60},
        signing_key(),
        algorithm="HS256",
    )
    with client.websocket_connect(f"/v1/game/ws?token={token}") as socket:
        ready = socket.receive_json()
        assert ready["type"] == "ready"
        assert ready["data"]["userId"] == "user-1"
        assert ready["data"]["email"] == "learner@oopsly.app"
        socket.send_json({"action": "water", "requestId": "pour-1", "treeId": tree_id})
        watered = socket.receive_json()
        assert watered["type"] == "garden"
        assert watered["requestId"] == "pour-1"
        assert watered["data"]["dewDrops"] == 5
        assert watered["data"]["plantedTrees"][0]["waterLevel"] == 75

        socket.send_json({"action": "water", "requestId": "pour-2", "treeId": tree_id})
        socket.receive_json()
        socket.send_json({"action": "water", "requestId": "pour-3", "treeId": tree_id})
        rejected = socket.receive_json()
        assert rejected["type"] == "error"
        assert rejected["message"] == "Not enough dew drops to water"

        socket.send_json({"action": "harvest", "requestId": "cut-1", "treeId": tree_id})
        early = socket.receive_json()
        assert early["type"] == "error"
        assert early["message"] == "This plant is not ready to harvest"
