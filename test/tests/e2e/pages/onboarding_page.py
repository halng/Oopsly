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


class OnboardingPage(BasePage):
    """Page object for the onboarding email input screen (/onboard)"""
    
    def __init__(self, page: Page):
        super().__init__(page)
        self.url = "http://localhost:8081/onboard"
        
        # Page elements
        self.back_button = page.get_by_label("Go back")
        self.heading = page.get_by_text("What's your email?")
        self.description = page.get_by_text("We'll send you a secure code to verify your account.")
        self.email_input = page.get_by_label("Email input field")
        self.continue_button = page.get_by_label("Continue button")
        
    def enter_email(self, email: str):
        """Enter email address in the input field"""
        self.email_input.fill(email)
        
    def click_continue(self):
        """Click the continue button"""
        self.continue_button.click()
        
    def is_continue_button_enabled(self) -> bool:
        """Check if continue button is enabled"""
        return not self.continue_button.is_disabled()
        
    def get_email_input_border_color(self) -> str:
        """Get the border color of email input (for validation state)"""
        return self.email_input.evaluate("el => getComputedStyle(el).borderColor")
        
    def wait_for_navigation_to_verification(self):
        """Wait for navigation to verification page"""
        self.page.wait_for_url("**/verification")
