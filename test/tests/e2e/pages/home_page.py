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

"""Oopsly Home Page - main dashboard with shelves and subjects."""

from playwright.sync_api import Page, expect, Locator
from .base_page import BasePage


class HomePage(BasePage):
    """Page object for Oopsly home screen."""

    def __init__(self, page: Page):
        super().__init__(page)
        self.url = "http://localhost:8081/"

        # --- Header Elements ---
        self.app_title = page.get_by_test_id("app-title-text")
        self.streak_container = page.get_by_test_id("streak-container")
        self.streak_count = page.get_by_test_id("streak-count-text")
        self.quote_text = page.get_by_test_id("quote-text")
        self.quote_author = page.get_by_test_id("quote-author-text")
        self.user_avatar = page.get_by_test_id("user-avatar")

        # --- Navigation / Quick Actions ---
        self.btn_create_shelf = page.get_by_test_id("create-shelf-button")
        self.btn_tasks = page.get_by_test_id("tasks-button")
        self.btn_notes = page.get_by_test_id("notes-button")
        self.btn_planner = page.get_by_test_id("planner-button")

        # --- Shelves ---
        self.shelves_scroll_view = page.get_by_test_id("shelves-scroll-view")

    def get_shelf_item(self, shelf_id: str) -> Locator:
        """Get a shelf container by ID."""
        return self.page.get_by_test_id(f"shelf-item-{shelf_id}")

    def get_shelf_name(self, shelf_id: str) -> Locator:
        """Get shelf name text by shelf ID."""
        return self.page.get_by_test_id(f"shelf-name-text-{shelf_id}")

    def get_subject_card(self, subject_id: str) -> Locator:
        """Get subject card by ID."""
        return self.page.get_by_test_id(f"subject-card-{subject_id}")

    def get_manage_shelf_button(self, shelf_id: str) -> Locator:
        """Get manage shelf button by shelf ID."""
        return self.page.get_by_test_id(f"manage-shelf-button-{shelf_id}")

    def navigate_to_quick_action(self, action: str):
        """Click a quick action button (Tasks, Notes, Planner)."""
        self.page.wait_for_load_state("networkidle")
        if action == "Tasks":
            self.btn_tasks.click()
        elif action == "Notes":
            self.btn_notes.click()
        elif action == "Planner":
            self.btn_planner.click()

    def click_create_shelf(self):
        """Open the create shelf modal."""
        self.btn_create_shelf.click()

    def open_subject_by_name(self, subject_name: str):
        """Find and click a subject card by its displayed name."""
        card = self.page.get_by_text(subject_name, exact=True).locator("xpath=../..")
        card.scroll_into_view_if_needed()
        expect(card).to_be_visible()
        card.click()
        expect(self.page).not_to_have_url(self.url)
