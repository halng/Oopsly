from app.kv import MemoryKV
from app.otp import MAX_ATTEMPTS, TTL_SECONDS, OtpService, OtpStatus


def _service(kv=None):
    return OtpService(kv or MemoryKV())


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
    otp = OtpService(MemoryKV(lambda: now[0]))
    code = otp.issue("a@b.co")
    now[0] = TTL_SECONDS + 1
    assert otp.verify("a@b.co", code) is OtpStatus.EXPIRED


def test_the_old_fixed_test_code_is_not_accepted():
    otp = _service()
    otp.issue("test@quizi.dev")
    assert otp.verify("test@quizi.dev", "000000") is OtpStatus.INVALID
