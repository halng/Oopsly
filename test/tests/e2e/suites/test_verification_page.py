#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License. You may use, copy, modify, merge, publish, distribute,
#  sublicense, and/or sell copies of the Software, subject to the following conditions:
#
#  1. The above copyright notice and this permission notice shall be included
#     in all copies or substantial portions of the Software.
#  2. The Software is provided "as is," without warranty of any kind, express or
#     implied, including but not limited to the warranties of merchantability,
#     fitness for a particular purpose, and noninfringement.
#  3. The authors or copyright holders shall not be liable for any claim, damages,
#     or other liability, whether in an action of contract, tort, or otherwise,
#     arising from, out of or in connection with the Software.

"""E2E tests for Oopsly OTP Verification page."""

import pytest
from playwright.sync_api import expect
from tests.e2e.pages.verification_page import VerificationPage


def test_verification_page_elements(page, current_device_name):
    """Verify verification page loads with OTP inputs and verify button."""
    # Navigate directly to verification (requires prior email entry)
    verification = VerificationPage(page)
    verification.navigate(verification.url)

    print(f"[{current_device_name}] Verifying Verification Page Elements...")

    expect(verification.screen).to_be_visible()
    expect(verification.title_text).to_be_visible()
    expect(verification.verify_button).to_be_visible()

    # All 6 OTP inputs should be present
    for i, inp in enumerate(verification.otp_inputs):
        expect(inp).to_be_visible()
