import time

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

KID = "test-key"


def new_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def jwk_for(private_key, kid=KID) -> dict:
    jwk = RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    return {**jwk, "kid": kid, "use": "sig", "alg": "RS256"}


def sign(private_key, kid=KID, **claims) -> str:
    payload = {"exp": int(time.time()) + 60, **claims}
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": kid})
