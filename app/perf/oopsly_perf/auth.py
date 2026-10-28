"""Stands in for the auth service: signs RS256 access tokens and publishes the matching JWKS."""

from __future__ import annotations

import base64
import json
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

KID = "perf-key"
JWKS_PATH = "/.well-known/pub.json"


def user_id(email: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, email))


def generate_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _b64(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def jwks(key: rsa.RSAPrivateKey) -> dict:
    numbers = key.public_key().public_numbers()
    jwk = {"kty": "RSA", "use": "sig", "alg": "RS256", "kid": KID, "n": _b64(numbers.n), "e": _b64(numbers.e)}
    return {"keys": [jwk]}


def serve_jwks(key: rsa.RSAPrivateKey, port: int) -> ThreadingHTTPServer:
    """Serve the public key on a daemon thread so the API under test can verify tokens."""
    body = json.dumps(jwks(key)).encode()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            found = self.path == JWKS_PATH
            self.send_response(200 if found else 404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body if found else b"{}")

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def mint_token(
    email: str, key: rsa.RSAPrivateKey, plan: str = "FREE", ttl_seconds: int = 3600
) -> str:
    """Access token carrying the claims the API reads: id, role, plan and the email as subject."""
    now = int(time.time())
    claims = {
        "id": user_id(email),
        "role": "USER",
        "plan": plan,
        "sub": email,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": KID})
