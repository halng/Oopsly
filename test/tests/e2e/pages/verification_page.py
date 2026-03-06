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

"""Oopsly OTP Verification Page."""

from playwright.sync_api import Page, expect
from .base_page import BasePage


class VerificationPage(BasePage):
    """Page object for OTP verification screen."""

    def __init__(self, page: Page):
        super().__init__(page)
        self.url = "http://localhost:8081/verification"

        self.screen = page.get_by_test_id("verification-screen")
        self.title_text = page.get_by_test_id("title-text")
        self.otp_inputs = [page.get_by_test_id(f"otp-input-{i}") for i in range(6)]
        self.verify_button = page.get_by_test_id("verify-button")
        self.resend_button = page.get_by_test_id("resend-button")

    def enter_otp(self, code: str):
        """Enter 6-digit OTP code."""
        if len(code) != 6:
            raise ValueError("OTP must be 6 digits")
        for i, digit in enumerate(code):
            self.otp_inputs[i].fill(digit)

    def click_verify(self):
        """Click verify button."""
        self.verify_button.click()
