"""RS256 signing keys: generation, weekly rotation and the JWKS we publish.

Each key signs for one rotation interval (activate_at to retire_at). The next key is
created and published `publish_lead` before it starts signing, so verifiers that cache
the JWKS already know its kid when the first token signed with it arrives. A retired key
stays published until the last token it signed has expired.
"""

import asyncio
import base64
import hashlib
import json
import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain import utc
from app.models import SigningKey

logger = logging.getLogger(__name__)

ALGORITHM = "RS256"
ADVISORY_LOCK_ID = 727274  # arbitrary, unique to the auth service
MISSING_KID_RELOAD = timedelta(seconds=5)
# Instances' clocks differ a little; a key that activates this soon already counts.
CLOCK_SKEW = timedelta(seconds=60)


def _b64url(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def public_jwk(public_key: rsa.RSAPublicKey) -> dict:
    numbers = public_key.public_numbers()
    n, e = _b64url(numbers.n), _b64url(numbers.e)
    # RFC 7638 thumbprint: stable, derived from the key itself.
    canonical = json.dumps({"e": e, "kty": "RSA", "n": n}, separators=(",", ":"))
    kid = base64.urlsafe_b64encode(hashlib.sha256(canonical.encode()).digest())
    return {
        "kty": "RSA",
        "use": "sig",
        "alg": ALGORITHM,
        "kid": kid.rstrip(b"=").decode(),
        "n": n,
        "e": e,
    }


def _is_current(activate_at: datetime, retire_at: datetime, now: datetime) -> bool:
    return activate_at - CLOCK_SKEW <= now < retire_at


@dataclass(frozen=True)
class StoredKey:
    kid: str
    activate_at: datetime
    retire_at: datetime
    jwk: dict
    private_pem: str


@dataclass(frozen=True)
class Snapshot:
    keys: list[StoredKey]  # newest activation first
    loaded_at: datetime


class KeyStore:
    def __init__(
        self,
        session_factory: Callable[[], Session],
        *,
        rotation_interval: timedelta,
        publish_lead: timedelta,
        retention: timedelta,
        passphrase: str = "",
        cache_ttl: timedelta = timedelta(seconds=60),
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        key_size: int = 2048,
    ):
        self._session_factory = session_factory
        self._interval = rotation_interval
        self._lead = publish_lead
        self._retention = retention
        self._passphrase = passphrase.encode() or None
        self._cache_ttl = cache_ttl
        self._now = now
        self._key_size = key_size
        self._lock = threading.RLock()
        self._snapshot: Snapshot | None = None
        self._private: dict[str, rsa.RSAPrivateKey] = {}
        self._public: dict[str, rsa.RSAPublicKey] = {}

    # --- reads (cached) ---

    def signing_key(self) -> tuple[str, rsa.RSAPrivateKey]:
        """The key to sign with now; rotates first when the schedule requires it."""
        snap = self._load()
        if self._needs_rotation(snap):
            self.rotate_if_due()
            snap = self._load(force=True)
        current = self._current(snap)
        if current is None:  # pragma: no cover - rotate_if_due always creates one
            raise RuntimeError("no active signing key")
        return current.kid, self._private_key(current)

    def public_key(self, kid: str) -> rsa.RSAPublicKey | None:
        """The verification key for kid, or None when we never published it."""
        snap = self._load()
        stored = self._find(snap, kid)
        if stored is None and self._now() - snap.loaded_at >= MISSING_KID_RELOAD:
            stored = self._find(self._load(force=True), kid)
        if stored is None:
            return None
        with self._lock:
            if kid not in self._public:
                self._public[kid] = RSAAlgorithm.from_jwk(json.dumps(stored.jwk))
            return self._public[kid]

    def jwks(self) -> dict:
        return {"keys": [k.jwk for k in self._load().keys]}

    # --- rotation ---

    def rotate_if_due(self) -> bool:
        """Creates the current/next key when missing and drops fully expired keys.

        Safe to call from every instance: a Postgres advisory lock serialises the
        writers and the unique activate_at makes a lost race a harmless no-op.
        """
        with self._session_factory() as db:
            if db.get_bind().dialect.name == "postgresql":
                db.execute(
                    text("SELECT pg_advisory_xact_lock(:id)"), {"id": ADVISORY_LOCK_ID}
                )
            # After the lock: a waiter must not act on a time from before the winner.
            now = self._now()
            rows = db.scalars(
                select(SigningKey)
                .where(SigningKey.expires_at > now)
                .order_by(SigningKey.activate_at.desc())
            ).all()
            created = self._create_missing(db, rows, now)
            purged = db.execute(
                delete(SigningKey)
                .where(SigningKey.expires_at <= now)
                .execution_options(synchronize_session=False)
            ).rowcount
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                return False
        if created or purged:
            logger.info("signing keys updated: created=%s purged=%s", created, purged)
            self._load(force=True)
        return bool(created)

    def _create_missing(
        self, db: Session, rows: list[SigningKey], now: datetime
    ) -> int:
        current = next(
            (r for r in rows if _is_current(utc(r.activate_at), utc(r.retire_at), now)),
            None,
        )
        if current is None:
            db.add(self._new_key(now, now))
            return 1
        retire_at = utc(current.retire_at)
        has_next = any(utc(r.activate_at) >= retire_at for r in rows)
        if not has_next and now >= retire_at - self._lead:
            db.add(self._new_key(retire_at, now))
            return 1
        return 0

    def _new_key(self, activate_at: datetime, now: datetime) -> SigningKey:
        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=self._key_size
        )
        encryption = (
            serialization.BestAvailableEncryption(self._passphrase)
            if self._passphrase
            else serialization.NoEncryption()
        )
        pem = private_key.private_bytes(
            serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, encryption
        )
        jwk = public_jwk(private_key.public_key())
        retire_at = activate_at + self._interval
        return SigningKey(
            kid=jwk["kid"],
            private_pem=pem.decode(),
            public_jwk=jwk,
            created_at=now,
            activate_at=activate_at,
            retire_at=retire_at,
            expires_at=retire_at + self._retention,
        )

    def _needs_rotation(self, snap: Snapshot) -> bool:
        now = self._now()
        current = self._current(snap)
        if current is None:
            return True
        has_next = any(k.activate_at >= current.retire_at for k in snap.keys)
        return not has_next and now >= current.retire_at - self._lead

    # --- snapshot ---

    def _load(self, force: bool = False) -> Snapshot:
        with self._lock:
            now = self._now()
            snap = self._snapshot
            if (
                snap is not None
                and not force
                and now - snap.loaded_at < self._cache_ttl
            ):
                return snap
            with self._session_factory() as db:
                rows = db.scalars(
                    select(SigningKey)
                    .where(SigningKey.expires_at > now)
                    .order_by(SigningKey.activate_at.desc())
                ).all()
                keys = [
                    StoredKey(
                        r.kid,
                        utc(r.activate_at),
                        utc(r.retire_at),
                        r.public_jwk,
                        r.private_pem,
                    )
                    for r in rows
                ]
            self._snapshot = Snapshot(keys, now)
            return self._snapshot

    def _current(self, snap: Snapshot) -> StoredKey | None:
        now = self._now()
        return next(
            (k for k in snap.keys if _is_current(k.activate_at, k.retire_at, now)), None
        )

    @staticmethod
    def _find(snap: Snapshot, kid: str) -> StoredKey | None:
        return next((k for k in snap.keys if k.kid == kid), None)

    def _private_key(self, stored: StoredKey) -> rsa.RSAPrivateKey:
        with self._lock:
            if stored.kid not in self._private:
                # Keys written before a passphrase was configured are unencrypted.
                password = (
                    self._passphrase if "ENCRYPTED" in stored.private_pem else None
                )
                self._private[stored.kid] = serialization.load_pem_private_key(
                    stored.private_pem.encode(), password
                )
            return self._private[stored.kid]


async def rotation_loop(store: KeyStore, interval_seconds: float) -> None:
    """Keeps keys rotated even when no token is being issued."""
    while True:
        try:
            await asyncio.to_thread(store.rotate_if_due)
        except Exception:
            logger.exception("signing key rotation failed")
        await asyncio.sleep(interval_seconds)
