import base64
import hashlib
import json
from datetime import timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from sqlalchemy import select

from app.keys import KeyStore, public_jwk, rotation_loop
from app.models import SigningKey
from tests.conftest import make_key_store


def _rows(factory):
    with factory() as db:
        rows = db.scalars(select(SigningKey).order_by(SigningKey.activate_at)).all()
        db.expunge_all()
        return rows


def test_first_start_creates_one_signing_key(key_store, session_factory, clock):
    assert key_store.rotate_if_due() is True
    (row,) = _rows(session_factory)
    assert row.activate_at.replace(tzinfo=clock().tzinfo) == clock()
    assert row.retire_at - row.activate_at == timedelta(days=7)
    assert key_store.rotate_if_due() is False


def test_jwk_is_a_rs256_signature_key_with_a_thumbprint_kid(key_store):
    key_store.rotate_if_due()
    (jwk,) = key_store.jwks()["keys"]
    assert (jwk["kty"], jwk["use"], jwk["alg"]) == ("RSA", "sig", "RS256")
    assert jwk["e"] == "AQAB"
    canonical = json.dumps(
        {"e": jwk["e"], "kty": "RSA", "n": jwk["n"]}, separators=(",", ":")
    )
    digest = hashlib.sha256(canonical.encode()).digest()
    assert jwk["kid"] == base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    assert "d" not in jwk and "p" not in jwk


def test_next_key_is_published_before_it_signs(key_store, clock):
    kid, _ = key_store.signing_key()
    assert len(key_store.jwks()["keys"]) == 1

    clock.advance(days=5, hours=23)
    key_store.signing_key()
    assert len(key_store.jwks()["keys"]) == 1

    clock.advance(hours=1)  # one day before the key retires
    same_kid, _ = key_store.signing_key()
    published = [k["kid"] for k in key_store.jwks()["keys"]]
    assert same_kid == kid
    assert len(published) == 2
    assert published[1] == kid  # newest activation first


def test_signing_key_switches_to_the_published_key_after_a_week(key_store, clock):
    first, _ = key_store.signing_key()
    clock.advance(days=6, hours=1)
    key_store.signing_key()
    (upcoming,) = [k["kid"] for k in key_store.jwks()["keys"] if k["kid"] != first]

    clock.advance(days=1)
    kid, _ = key_store.signing_key()
    assert kid == upcoming
    published = {k["kid"] for k in key_store.jwks()["keys"]}
    assert first in published  # still verifies tokens signed before the switch


def test_retired_key_leaves_the_jwks_after_its_tokens_expire(
    key_store, session_factory, clock
):
    first, _ = key_store.signing_key()
    clock.advance(days=6, hours=1)
    key_store.signing_key()
    clock.advance(days=1)
    key_store.signing_key()

    clock.advance(days=8)  # retire_at + retention (8 days)
    key_store.signing_key()
    published = {k["kid"] for k in key_store.jwks()["keys"]}
    assert first not in published
    assert first not in {r.kid for r in _rows(session_factory)}


def test_long_outage_creates_a_fresh_current_key(key_store, clock):
    first, _ = key_store.signing_key()
    clock.advance(days=60)
    kid, _ = key_store.signing_key()
    assert kid != first


def test_public_key_lookup_and_unknown_kid(key_store, clock):
    kid, private_key = key_store.signing_key()
    public_key = key_store.public_key(kid)
    assert public_key.public_numbers() == private_key.public_key().public_numbers()
    assert key_store.public_key("nope") is None
    clock.advance(seconds=10)  # past the reload throttle: asks the database again
    assert key_store.public_key("nope") is None


def test_unknown_kid_reload_picks_up_a_key_created_by_another_instance(
    session_factory, clock
):
    ours = make_key_store(session_factory, clock)
    ours.signing_key()
    theirs = make_key_store(session_factory, clock)
    clock.advance(days=6, hours=1)
    assert len(ours.jwks()["keys"]) == 1  # warm snapshot taken before the rotation
    theirs.rotate_if_due()
    (new_kid,) = {k["kid"] for k in theirs.jwks()["keys"]} - {
        k["kid"] for k in ours.jwks()["keys"]
    }
    clock.advance(seconds=10)  # snapshot still fresh, but past the reload throttle
    assert ours.public_key(new_kid) is not None


def test_snapshot_is_cached_until_it_expires(session_factory, clock):
    store = make_key_store(session_factory, clock)
    store.signing_key()
    other = make_key_store(session_factory, clock)
    clock.advance(days=6, hours=1)
    assert len(store.jwks()["keys"]) == 1
    other.rotate_if_due()
    assert len(store.jwks()["keys"]) == 1
    clock.advance(seconds=61)
    assert len(store.jwks()["keys"]) == 2


def test_passphrase_encrypts_the_stored_private_key(session_factory, clock):
    store = make_key_store(session_factory, clock, passphrase="s3cret")
    kid, key = store.signing_key()
    (row,) = _rows(session_factory)
    assert "ENCRYPTED" in row.private_pem
    reloaded = serialization.load_pem_private_key(row.private_pem.encode(), b"s3cret")
    assert reloaded.private_numbers() == key.private_numbers()
    assert kid == row.kid


def test_unencrypted_keys_still_load_after_a_passphrase_is_configured(
    session_factory, clock
):
    make_key_store(session_factory, clock).signing_key()
    store = make_key_store(session_factory, clock, passphrase="s3cret")
    kid, key = store.signing_key()
    assert key.public_key().public_numbers() == store.public_key(kid).public_numbers()


def test_losing_a_rotation_race_is_a_noop(session_factory, clock, key_store):
    key_store.rotate_if_due()
    (existing,) = _rows(session_factory)
    loser = make_key_store(session_factory, clock)

    def clash(db, rows, now):
        db.add(
            SigningKey(
                kid="other",
                private_pem="x",
                public_jwk={},
                created_at=now,
                activate_at=existing.activate_at,  # unique
                retire_at=now,
                expires_at=now,
            )
        )
        return 1

    loser._create_missing = clash
    assert loser.rotate_if_due() is False
    assert len(_rows(session_factory)) == 1


def test_tokens_verify_with_the_published_jwk(key_store):
    kid, private_key = key_store.signing_key()
    token = jwt.encode({"id": "1"}, private_key, "RS256", headers={"kid": kid})
    (jwk,) = key_store.jwks()["keys"]
    public_key = jwt.PyJWK(jwk).key
    assert jwt.decode(token, public_key, algorithms=["RS256"]) == {"id": "1"}
    assert public_jwk(private_key.public_key()) == jwk


def test_rotation_loop_survives_a_failing_rotation():
    import asyncio

    calls = []

    class Flaky(KeyStore):
        def __init__(self):
            pass

        def rotate_if_due(self):
            calls.append(1)
            if len(calls) == 1:
                raise RuntimeError("database is down")
            raise asyncio.CancelledError

    async def run():
        with pytest.raises(asyncio.CancelledError):
            await rotation_loop(Flaky(), 0)

    asyncio.run(run())
    assert len(calls) == 2


def test_instances_with_skewed_clocks_do_not_create_a_second_key(
    session_factory, clock
):
    from tests.conftest import Clock

    behind = Clock()
    behind.value = clock() - timedelta(seconds=5)
    ahead = make_key_store(session_factory, clock)
    late = make_key_store(session_factory, behind)
    assert ahead.rotate_if_due() is True
    assert late.rotate_if_due() is False  # the key "activates" 5s in its future
    kid, _ = late.signing_key()
    assert kid == ahead.signing_key()[0]
    assert len(_rows(session_factory)) == 1
