import logging
import sys

import pytest
from sqlalchemy.exc import IntegrityError

from app import db as database
from app.logging_config import OopslyFormatter
from app.models import Tree
from app.play import play_message
from app.rules import next_stage
from app.seed_pouch import BAND_WEIGHTS, RARITIES, roll
from app.service import _roll_unit, apply_growth, get_or_create_garden


def test_health_reports_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"isSuccess": True, "message": "ok", "data": None}


def test_get_db_yields_a_session_and_closes_it(monkeypatch):
    closed = []

    class FakeSession:
        def close(self):
            closed.append(True)

    monkeypatch.setattr(database, "SessionLocal", FakeSession)
    generator = database.get_db()
    assert isinstance(next(generator), FakeSession)
    generator.close()
    assert closed == [True]


def test_formatter_appends_the_exception_trace():
    try:
        raise RuntimeError("boom")
    except RuntimeError:
        record = logging.LogRecord(
            "app.test", logging.ERROR, __file__, 1, "failed", None, sys.exc_info()
        )
    assert "RuntimeError: boom" in OopslyFormatter().format(record)


def test_the_last_stage_stays_ancient():
    assert next_stage("seed") == "sprout"
    assert next_stage("ancient") == "ancient"


def test_ancient_trees_cap_their_growth():
    tree = Tree(stage="blooming", growth_progress=90)
    apply_growth(tree, 250)
    assert tree.stage == "ancient"
    assert tree.growth_progress == 100


def test_roll_unit_is_a_unit_interval_value():
    assert 0.0 <= _roll_unit() < 1.0


@pytest.mark.parametrize("band", list(BAND_WEIGHTS))
def test_roll_clamps_out_of_range_values(band):
    assert roll(band, -3.0) == roll(band, 0.0)
    assert roll(band, 7.0) == roll(band, 1.0)
    assert roll(band, 1.0)[1] in RARITIES


def test_a_failed_insert_without_a_winner_is_re_raised(session_factory):
    db = session_factory()

    def explode():
        raise IntegrityError("insert", {}, Exception("duplicate"))

    db.flush = explode
    with pytest.raises(IntegrityError):
        get_or_create_garden(db, "user-1")
    db.close()


@pytest.mark.parametrize(
    "message",
    [
        {"action": "plant", "species": "camphor_tree", "requestId": "r1"},
        {"action": "unlock", "plotIndex": "abc", "requestId": "r1"},
    ],
)
def test_play_rejects_malformed_payloads(session_factory, message):
    reply = play_message("user-1", message)
    assert reply["type"] == "error"
    assert reply["requestId"] == "r1"
    assert reply["message"] == "Could not play that action"


def test_play_rejects_unknown_and_missing_actions(session_factory):
    unknown = play_message("user-1", {"action": "dance", "requestId": "r2"})
    assert unknown["message"] == "Unknown garden action"
    assert play_message("user-1", {})["requestId"] is None


def test_a_bad_token_is_logged_without_its_content(client, caplog):
    caplog.set_level(logging.WARNING, logger="app.socket")
    with client.websocket_connect("/v1/game/ws?token=evil%0Aforged") as socket:
        socket.receive_json()
    messages = [record.getMessage() for record in caplog.records]
    assert messages == ["JWT authentication failed: DecodeError"]
