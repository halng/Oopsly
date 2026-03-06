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

"""E2E tests for Oopsly Home page."""

import pytest
from playwright.sync_api import expect
from tests.e2e.pages.home_page import HomePage


def test_home_initial_render(page, current_device_name):
    """Verify critical home page components load."""
    home = HomePage(page)
    home.navigate(home.url)

    print(f"[{current_device_name}] Verifying Oopsly Home Page Elements...")

    # Assert header
    expect(home.app_title).to_be_visible()
    expect(home.app_title).to_have_text("Oopsly")
    expect(home.streak_container).to_be_visible()
    expect(home.quote_text).to_be_visible()

    # Assert navigation menu
    expect(home.btn_create_shelf).to_be_visible()
    expect(home.btn_tasks).to_be_visible()
    expect(home.btn_notes).to_be_visible()
    expect(home.btn_planner).to_be_visible()

    # Assert shelves area exists
    expect(home.shelves_scroll_view).to_be_visible()


@pytest.mark.parametrize("action_name", ["Tasks", "Notes", "Planner"])
def test_quick_action_navigation(page, current_device_name, action_name):
    """Verify main menu buttons are clickable and navigate."""
    home = HomePage(page)
    home.navigate(home.url)

    print(f"[{current_device_name}] Testing navigation for: {action_name}")
    home.navigate_to_quick_action(action_name)


def test_create_shelf_button_visible(page, current_device_name):
    """Verify Create Shelf button is present and clickable."""
    home = HomePage(page)
    home.navigate(home.url)

    expect(home.btn_create_shelf).to_be_visible()
    home.click_create_shelf()
    # Modal should open
    expect(page.get_by_test_id("create-shelf-modal")).to_be_visible()
