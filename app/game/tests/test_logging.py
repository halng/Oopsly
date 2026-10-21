import logging
import re

from app.logging_config import OopslyFormatter, request_id, request_platform


def test_log_line_matches_the_api_template():
    request_platform.set("WEB")
    request_id.set("01JTEST")
    record = logging.LogRecord(
        name="app.socket",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="User %s authenticated with role %s",
        args=("user-9", "USER"),
        exc_info=None,
    )
    record.threadName = "MainThread"
    line = re.sub(r"\033\[[0-9;]*m", "", OopslyFormatter().format(record))
    assert re.fullmatch(
        r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} INFO  "
        r"\[MainThread\] \[WEB:01JTEST\] app.socket - "
        r"User user-9 authenticated with role USER",
        line,
    )
