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

import re
from playwright.sync_api import Page, expect, Locator
from .base_page import BasePage


class HomePage(BasePage):
    def __init__(self, page: Page):
        super().__init__(page)
        self.url = "http://localhost:8081/"  # Standard Expo Web URL

        # --- Static Header Elements ---
        self.app_title = page.get_by_text("Osmosis", exact=True)
        self.streak_badge = page.locator("text=7").first  # The flame icon badge
        self.quote_text = page.get_by_text("The expert in anything was once a beginner")

        # --- Quick Actions ---
        self.btn_tasks = page.get_by_test_id("quick-action-tasks")
        self.btn_notes = page.get_by_test_id("quick-action-notes")
        self.btn_planner = page.get_by_test_id("quick-action-planner")
        self.btn_create_test = page.get_by_test_id("quick-action-create-test")

        # --- Shelves Container ---
        # Used to scope searches or verify scrolling
        self.main_scroll_view = page.get_by_test_id("main-scroll-view")

    def get_shelf_title(self, shelf_id: str) -> Locator:
        """Locates a specific shelf title, e.g., '1' for Computer Science"""
        return self.page.get_by_test_id(f"shelf-name-{shelf_id}")

    def get_subject_card(self, subject_name: str) -> Locator:
        """
        Locates a subject card by name.
        Since RN Web creates nested divs, we find the text, then grab the
        clickable parent (TouchableOpacity) to ensure the click works.
        """
        # Finds the text, then finds the closest parent that acts as the card container
        return self.page.get_by_text(subject_name, exact=True).locator("xpath=../..")

    def navigate_to_quick_action(self, action: str):
        """Clicks a quick action and waits for navigation"""
        self.page.wait_for_load_state("networkidle")
        if action == "Tasks":
            self.btn_tasks.click()
            expect(self.page).to_have_url("http://localhost:8081/tasks-list")
        elif action == "Notes":
            self.btn_notes.click()
            expect(self.page).to_have_url(re.compile(".*notes"))
        elif action == "Planner":
            self.btn_planner.click()
            expect(self.page).to_have_url(re.compile(".*study-planner"))

    def open_subject(self, subject_name: str):
        """Scrolls to a subject card and clicks it"""
        card = self.get_subject_card(subject_name)

        # This handles the horizontal scroll automatically in Playwright
        card.scroll_into_view_if_needed()
        expect(card).to_be_visible()

        # Click and verify we navigated away from home
        card.click()
        expect(self.page).not_to_have_url(self.url)
