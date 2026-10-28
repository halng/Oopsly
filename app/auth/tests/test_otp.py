from app.kv import MemoryKV
from app.otp import MAX_ATTEMPTS, TEST_CODE, TTL_SECONDS, OtpService, OtpStatus


def _service(kv=None, tests=("test@oopsly.dev",)):
    return OtpService(kv or MemoryKV(), list(tests))


def test_issue_creates_a_six_digit_code_that_verifies_once():
    otp = _service()
    code = otp.issue("User@Example.com")
    assert len(code) == 6 and code.isdigit()
    assert otp.verify("user@example.com", code) is OtpStatus.VALID
    assert otp.verify("user@example.com", code) is OtpStatus.EXPIRED


def test_wrong_codes_count_down_to_invalidation():
    otp = _service()
    code = otp.issue("a@b.co")
    wrong = "000001" if code != "000001" else "000002"
    for _ in range(MAX_ATTEMPTS):
        assert otp.verify("a@b.co", wrong) is OtpStatus.INVALID
    assert otp.verify("a@b.co", wrong) is OtpStatus.INVALIDATED
    assert otp.verify("a@b.co", code) is OtpStatus.INVALIDATED


def test_unknown_email_is_expired():
    assert _service().verify("nobody@b.co", "123456") is OtpStatus.EXPIRED


def test_code_expires_with_its_ttl():
    now = [0.0]
    otp = OtpService(MemoryKV(lambda: now[0]), [])
    code = otp.issue("a@b.co")
    now[0] = TTL_SECONDS + 1
    assert otp.verify("a@b.co", code) is OtpStatus.EXPIRED


def test_test_emails_bypass_with_the_fixed_code():
    otp = _service()
    assert otp.is_test_email("TEST@oopsly.dev")
    assert otp.verify("test@oopsly.dev", TEST_CODE) is OtpStatus.VALID
    assert not otp.is_test_email("a@b.co")
    assert otp.verify("a@b.co", TEST_CODE) is OtpStatus.EXPIRED
