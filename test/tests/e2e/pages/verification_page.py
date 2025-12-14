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
#     arising from, out of, or in connection with the Software.

from playwright.sync_api import Page, expect, Locator
from .base_page import BasePage


class VerificationPage(BasePage):
    """Page object for the OTP verification screen (/verification)"""
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.url = "http://localhost:8081/verification"
        
        # Page elements
        self.back_button = page.get_by_label("Go back")
        self.heading = page.get_by_text("Verify your email")
        self.verify_button = page.get_by_label("Verify and create account")
        self.resend_link = page.get_by_text("Resend")
        
    def get_otp_input(self, index: int) -> Locator:
        """Get a specific OTP input field by index (1-6)"""
        return self.page.get_by_label(f"OTP digit {index}")
        
    def enter_otp(self, otp: str):
        """Enter OTP code (6 digits)"""
        if len(otp) != 6:
            raise ValueError("OTP must be 6 digits")
            
        for i, digit in enumerate(otp, start=1):
            self.get_otp_input(i).fill(digit)
            
    def click_verify(self):
        """Click the verify button"""
        self.verify_button.click()
        
    def click_resend(self):
        """Click the resend link"""
        self.resend_link.click()
        
    def is_verify_button_enabled(self) -> bool:
        """Check if verify button is enabled"""
        return not self.verify_button.is_disabled()
        
    def get_timer_text(self) -> str:
        """Get the timer countdown text"""
        # Timer shows format like "02:00"
        timer = self.page.locator("text=/\\d{2}:\\d{2}/").first
        return timer.text_content() or ""
        
    def wait_for_timer_to_expire(self):
        """Wait for timer to reach 00:00"""
        expect(self.page.get_by_text("00:00")).to_be_visible(timeout=125000)
        
    def is_resend_active(self) -> bool:
        """Check if resend link is active (not grayed out)"""
        # Check if the text has the active color class
        return "text-indigo-600" in (self.resend_link.get_attribute("class") or "")
        
    def wait_for_navigation_to_user_area(self):
        """Wait for navigation to user area after successful verification"""
        self.page.wait_for_url("**/user")
