"""Issues and verifies one-time codes stored in the KV."""

import hmac
import secrets
from enum import Enum

from app.kv import KV

OTP_KEY_PREFIX = "otp:"
ATTEMPT_KEY_PREFIX = "otp_attempt:"
TTL_SECONDS = 5 * 60
MAX_ATTEMPTS = 3
TEST_CODE = "000000"


class OtpStatus(Enum):
    VALID = "valid"
    INVALID = "invalid"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"


def key(email: str) -> str:
    """The full address is used so different domains never collide."""
    return email.strip().lower()


class OtpService:
    def __init__(self, kv: KV, test_emails: list[str]):
        self._kv = kv
        self._test_emails = [e.lower() for e in test_emails]

    def is_test_email(self, email: str) -> bool:
        return email.lower() in self._test_emails

    def issue(self, email: str) -> str:
        """Creates a 6-digit code, stores it with a fresh attempt counter."""
        code = str(secrets.randbelow(900_000) + 100_000)
        k = key(email)
        self._kv.set(OTP_KEY_PREFIX + k, code, TTL_SECONDS)
        self._kv.set(ATTEMPT_KEY_PREFIX + k, "0", TTL_SECONDS)
        return code

    def verify(self, email: str, code: str) -> OtpStatus:
        if self.is_test_email(email) and code == TEST_CODE:
            return OtpStatus.VALID
        k = key(email)
        stored = self._kv.get(OTP_KEY_PREFIX + k)
        if stored is None:
            return OtpStatus.EXPIRED
        attempts = int(self._kv.get(ATTEMPT_KEY_PREFIX + k) or 0)
        if attempts >= MAX_ATTEMPTS:
            return OtpStatus.INVALIDATED
        if hmac.compare_digest(stored.encode(), code.encode()):
            self._kv.delete(OTP_KEY_PREFIX + k, ATTEMPT_KEY_PREFIX + k)
            return OtpStatus.VALID
        self._kv.set(ATTEMPT_KEY_PREFIX + k, str(attempts + 1), TTL_SECONDS)
        return OtpStatus.INVALID
