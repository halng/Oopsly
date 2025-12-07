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
import pytest
from playwright.sync_api import expect
from tests.e2e.pages.home_page import HomePage


def test_home_initial_render(page, current_device_name):
    """
    1. SANITY CHECK: Ensure the critical components load.
    """
    home = HomePage(page)
    home.navigate(home.url)

    print(f"[{current_device_name}] Verifying Home Page Elements...")

    # Assert Header
    expect(home.app_title).to_be_visible()
    expect(home.streak_badge).to_be_visible()

    # Assert Quote Section
    expect(home.quote_text).to_be_visible()

    # Assert All Menu Items are present
    expect(home.btn_tasks).to_be_visible()
    expect(home.btn_notes).to_be_visible()
    expect(home.btn_planner).to_be_visible()

    # Assert Shelf Titles exist (checking first and last)
    # Using the IDs defined in your dummyData (1=CS, 4=Sciences)
    expect(page.get_by_test_id("shelf-name-1")).to_have_text("Computer Science")
    expect(page.get_by_test_id("shelf-name-4")).to_have_text("Sciences")


@pytest.mark.parametrize("action_name", ["Tasks", "Notes", "Planner"])
def test_quick_action_navigation(page, current_device_name, action_name):
    """
    2. NAVIGATION CHECK: Verify the main menu buttons actually route the user.
    Uses parameterization to run for each button.
    """
    home = HomePage(page)
    home.navigate(home.url)

    print(f"[{current_device_name}] Testing navigation for: {action_name}")
    home.navigate_to_quick_action(action_name)
