import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.tokens import TokenService
from tests.conftest import make_key_store


@pytest.fixture
def tokens(key_store, clock):
    return TokenService(key_store, timedelta(hours=1), timedelta(days=7), clock)


def _b64(data: dict) -> str:
    raw = json.dumps(data).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def test_access_token_carries_the_claims_and_the_kid(tokens, key_store, clock):
    token = tokens.access_token("user-1", "a@b.co", "USER", "PRO")
    header = jwt.get_unverified_header(token)
    assert header["alg"] == "RS256"
    assert header["kid"] == key_store.signing_key()[0]
    claims = jwt.decode(token, options={"verify_signature": False})
    assert claims == {
        "sub": "a@b.co",
        "id": "user-1",
        "role": "USER",
        "plan": "PRO",
        "iat": int(clock().timestamp()),
        "exp": int((clock() + timedelta(hours=1)).timestamp()),
    }


def test_parse_round_trips_and_refresh_tokens_are_distinct(tokens):
    assert tokens.parse(tokens.access_token("u", "a@b.co", "USER", "FREE"))["id"] == "u"
    first, second = tokens.refresh_token("a@b.co"), tokens.refresh_token("a@b.co")
    assert first != second
    assert tokens.parse(first)["sub"] == "a@b.co"


def test_token_signed_before_rotation_still_verifies(tokens, clock):
    old = tokens.access_token("u", "a@b.co", "USER", "FREE")
    clock.advance(days=8)
    tokens.access_token("u", "a@b.co", "USER", "FREE")  # signs with the new key
    assert tokens.parse(old)["id"] == "u"


def test_expired_token_is_rejected(key_store):
    stale = TokenService(
        key_store,
        timedelta(hours=1),
        timedelta(days=7),
        lambda: datetime(2020, 1, 1, tzinfo=UTC),
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        stale.parse(stale.access_token("u", "a@b.co", "USER", "FREE"))


def test_tampered_signature_is_rejected(tokens):
    head, payload, signature = tokens.access_token("u", "a@b.co", "USER", "FREE").split(
        "."
    )
    forged = ".".join([head, _b64({"id": "admin", "exp": 9999999999}), signature])
    with pytest.raises(jwt.InvalidSignatureError):
        tokens.parse(forged)


def test_token_from_a_foreign_key_with_our_kid_is_rejected(tokens, key_store):
    kid, _ = key_store.signing_key()
    foreign = rsa.generate_private_key(public_exponent=65537, key_size=1024)
    token = jwt.encode(
        {"id": "u", "exp": 9999999999}, foreign, "RS256", headers={"kid": kid}
    )
    with pytest.raises(jwt.InvalidSignatureError):
        tokens.parse(token)


def test_unknown_or_missing_kid_is_rejected(tokens, key_store):
    _, key = key_store.signing_key()
    claims = {"id": "u", "exp": 9999999999}
    with pytest.raises(jwt.InvalidKeyError):
        tokens.parse(jwt.encode(claims, key, "RS256", headers={"kid": "nope"}))
    with pytest.raises(jwt.InvalidKeyError):
        tokens.parse(jwt.encode(claims, key, "RS256"))


def test_only_rs256_is_accepted(tokens, key_store):
    kid, _ = key_store.signing_key()
    # Algorithm confusion: an HS256 token "signed" with the public key as the secret.
    public_pem = key_store.public_key(kid).public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    )
    signing_input = (
        f"{_b64({'alg': 'HS256', 'kid': kid})}.{_b64({'id': 'u', 'exp': 9999999999})}"
    )
    mac = hmac.new(public_pem, signing_input.encode(), hashlib.sha256).digest()
    forged = signing_input + "." + base64.urlsafe_b64encode(mac).rstrip(b"=").decode()
    with pytest.raises(jwt.InvalidAlgorithmError):
        tokens.parse(forged)
    unsigned = f"{_b64({'alg': 'none', 'kid': kid})}.{_b64({'id': 'u'})}."
    with pytest.raises(jwt.InvalidAlgorithmError):
        tokens.parse(unsigned)


def test_token_without_exp_is_rejected(tokens, key_store):
    kid, key = key_store.signing_key()
    token = jwt.encode({"id": "u"}, key, "RS256", headers={"kid": kid})
    with pytest.raises(jwt.MissingRequiredClaimError):
        tokens.parse(token)


def test_each_service_instance_verifies_the_others_tokens(session_factory, clock):
    a = TokenService(
        make_key_store(session_factory, clock),
        timedelta(hours=1),
        timedelta(days=1),
        clock,
    )
    b = TokenService(
        make_key_store(session_factory, clock),
        timedelta(hours=1),
        timedelta(days=1),
        clock,
    )
    assert b.parse(a.access_token("u", "a@b.co", "USER", "FREE"))["id"] == "u"
