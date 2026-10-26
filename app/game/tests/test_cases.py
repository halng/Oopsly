from sqlalchemy import select

from app.models import Garden, Tree


def test_creating_a_garden_that_already_exists_returns_it(session_factory):
    from app.service import get_or_create_garden

    db = session_factory()
    created = get_or_create_garden(db, "user-1")
    real_scalar = db.scalar

    def miss_once(statement):
        miss_once.calls += 1
        if miss_once.calls == 1:
            return None
        return real_scalar(statement)

    miss_once.calls = 0
    db.scalar = miss_once
    again = get_or_create_garden(db, "user-1")
    assert again.id == created.id
    assert len(again.plots) == 9
    db.close()


def test_repeat_fetch_returns_the_same_garden(client):
    first = client.get("/v1/game/garden").json()["data"]
    second = client.get("/v1/game/garden").json()["data"]
    assert [plot["index"] for plot in second["plots"]] == list(range(9))
    assert (
        second["seedInventory"]["camphor_tree"]
        == first["seedInventory"]["camphor_tree"]
    )
    assert second["forestLevel"] == 1


def test_plant_rejects_locked_occupied_missing_and_unknown_seeds(client):
    locked = client.post(
        "/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 8}
    )
    assert locked.status_code == 400
    assert locked.json()["message"] == "This land plot is still locked"

    client.post("/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 0})
    occupied = client.post(
        "/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 0}
    )
    assert occupied.status_code == 400
    assert occupied.json()["message"] == "This land plot already has a plant"

    missing = client.post(
        "/v1/game/plants", json={"species": "citrus_grove", "plotIndex": 1}
    )
    assert missing.status_code == 400
    assert missing.json()["message"] == "You do not have this seed in your inventory"

    unknown = client.post(
        "/v1/game/plants", json={"species": "moon_tree", "plotIndex": 1}
    )
    assert unknown.status_code == 400
    assert unknown.json()["message"] == "Unknown seed"

    absent = client.post(
        "/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 20}
    )
    assert absent.status_code == 400
    assert absent.json()["message"] == "Land plot not found"


def test_water_and_harvest_reject_unknown_trees(client):
    watered = client.post("/v1/game/plants/water", json={"treeId": "missing"})
    assert watered.status_code == 400
    assert watered.json()["message"] == "Plant not found in your garden"
    harvested = client.post("/v1/game/plants/harvest", json={"treeId": "missing"})
    assert harvested.status_code == 400
    assert harvested.json()["message"] == "Plant not found in your garden"


def test_watering_advances_a_full_stage(client, session_factory):
    planted = client.post(
        "/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 0}
    )
    tree_id = planted.json()["data"]["plantedTrees"][0]["id"]
    db = session_factory()
    stored = db.scalar(select(Tree).where(Tree.id == tree_id))
    stored.stage = "seed"
    stored.growth_progress = 95
    garden = db.scalar(select(Garden).where(Garden.user_id == "user-1"))
    garden.dew_drops = 5
    db.commit()
    db.close()

    watered = client.post("/v1/game/plants/water", json={"treeId": tree_id})
    tree = watered.json()["data"]["plantedTrees"][0]
    assert tree["stage"] == "sprout"
    assert tree["growthProgress"] == 5
    assert tree["waterLevel"] == 75
    assert watered.json()["data"]["dewDrops"] == 0


def test_unlock_is_idempotent_and_rejects_a_missing_plot(client, session_factory):
    missing = client.post("/v1/game/plots/unlock", json={"plotIndex": 40})
    assert missing.status_code == 400
    assert missing.json()["message"] == "Land plot not found"

    db = session_factory()
    garden = db.scalar(select(Garden).where(Garden.user_id == "user-1"))
    garden.forest_coins = 50
    db.commit()
    db.close()

    first = client.post("/v1/game/plots/unlock", json={"plotIndex": 3})
    assert first.json()["data"]["forestCoins"] == 0
    second = client.post("/v1/game/plots/unlock", json={"plotIndex": 3})
    assert second.status_code == 200
    assert second.json()["data"]["forestCoins"] == 0
    plot = next(item for item in second.json()["data"]["plots"] if item["index"] == 3)
    assert plot["isUnlocked"] is True


def test_focus_grows_trees_and_raises_forest_level(client, monkeypatch):
    monkeypatch.setattr("app.service._roll_unit", lambda: 0.85)
    client.post("/v1/game/plants", json={"species": "camphor_tree", "plotIndex": 0})
    reward = client.post("/v1/game/rewards/focus", json={"focusMinutes": 50})
    body = reward.json()["data"]
    assert body["species"] == "camphor_tree"
    assert body["rarity"] == "Legendary"
    assert body["growthPointsGained"] == 100
    assert body["garden"]["forestLevel"] == 2
    assert body["garden"]["completedSessionsCount"] == 1
    assert body["garden"]["plantedTrees"][0]["stage"] == "sprout"
    assert body["garden"]["plantedTrees"][0]["growthProgress"] == 0
    assert body["garden"]["seedInventory"]["camphor_tree"] == 1


def test_review_and_test_rewards_follow_their_bands(client, monkeypatch):
    rolls = iter([0.0, 0.995, 0.0, 0.0])
    monkeypatch.setattr("app.service._roll_unit", lambda: next(rolls))

    review = client.post(
        "/v1/game/rewards/review",
        json={"cardsReviewed": 3, "again": 2, "hard": 1, "good": 0, "easy": 0},
    )
    reviewed = review.json()["data"]
    assert reviewed["species"] == "wildflower_meadow"
    assert reviewed["dewDropsGained"] == 3
    assert reviewed["forestCoinsGained"] == 1
    assert reviewed["sunlightOrbsGained"] == 0
    assert reviewed["growthPointsGained"] == 6

    stepped = client.post(
        "/v1/game/rewards/review",
        json={"cardsReviewed": 10, "again": 0, "hard": 0, "good": 7, "easy": 0},
    )
    assert stepped.json()["data"]["rarity"] == "Legendary"
    assert stepped.json()["data"]["dewDropsGained"] == 10
    assert stepped.json()["data"]["forestCoinsGained"] == 5
    assert stepped.json()["data"]["sunlightOrbsGained"] == 2

    low = client.post("/v1/game/rewards/test", json={"percentage": 40})
    assert low.json()["data"]["sunlightOrbsGained"] == 2
    assert low.json()["data"]["forestCoinsGained"] == 4
    assert low.json()["data"]["growthPointsGained"] == 8

    high = client.post("/v1/game/rewards/test", json={"percentage": 100})
    assert high.json()["data"]["sunlightOrbsGained"] == 5
    assert high.json()["data"]["forestCoinsGained"] == 10
    assert high.json()["data"]["growthPointsGained"] == 20


def test_reward_payloads_are_validated(client):
    assert (
        client.post("/v1/game/rewards/focus", json={"focusMinutes": 0}).status_code
        == 422
    )
    assert (
        client.post(
            "/v1/game/rewards/review",
            json={"cardsReviewed": 0, "again": 0, "hard": 0, "good": 0, "easy": 0},
        ).status_code
        == 422
    )
    assert (
        client.post("/v1/game/rewards/test", json={"percentage": 101}).status_code
        == 422
    )
    assert (
        client.post("/v1/game/rewards/test", json={"percentage": -1}).status_code == 422
    )


def test_socket_plants_unlocks_and_harvests(client, session_factory):
    with client.websocket_connect("/v1/game/ws?token=" + _token()) as socket:
        assert socket.receive_json()["type"] == "ready"
        socket.send_json(
            {
                "action": "plant",
                "requestId": "sow-1",
                "species": "camphor_tree",
                "plotIndex": 0,
                "nickname": "Totoro",
            }
        )
        planted = socket.receive_json()
        assert planted["type"] == "garden"
        tree_id = planted["data"]["plantedTrees"][0]["id"]
        assert planted["data"]["plantedTrees"][0]["nickname"] == "Totoro"

        socket.send_json({"action": "unlock", "requestId": "land-1", "plotIndex": 3})
        locked = socket.receive_json()
        assert locked["type"] == "error"
        assert locked["message"] == "Not enough forest coins to unlock"

        socket.send_json({"action": "nope", "requestId": "bad-1"})
        unknown = socket.receive_json()
        assert unknown["message"] == "Unknown garden action"

    db = session_factory()
    garden = db.scalar(select(Garden).where(Garden.user_id == "user-1"))
    garden.forest_coins = 50
    stored = db.scalar(select(Tree).where(Tree.id == tree_id))
    stored.stage = "ancient"
    db.commit()
    db.close()

    with client.websocket_connect("/v1/game/ws?token=" + _token()) as socket:
        socket.receive_json()
        socket.send_json({"action": "unlock", "requestId": "land-2", "plotIndex": 3})
        opened = socket.receive_json()
        assert opened["type"] == "garden"
        assert opened["data"]["forestCoins"] == 0
        socket.send_json({"action": "harvest", "requestId": "cut-2", "treeId": tree_id})
        reward = socket.receive_json()
        assert reward["type"] == "reward"
        assert reward["data"]["xpGained"] == 240
        assert reward["data"]["garden"]["plantedTrees"] == []


def _token() -> str:
    import time

    import jwt

    from app.auth import signing_key

    return jwt.encode(
        {
            "id": "user-1",
            "sub": "learner@oopsly.app",
            "role": "USER",
            "exp": int(time.time()) + 60,
        },
        signing_key(),
        algorithm="HS256",
    )
