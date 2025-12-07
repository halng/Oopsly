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

import pytest
from playwright.sync_api import expect

# 1. Define your Device Matrix statically
# These values are standard Playwright device descriptors
DEVICE_CONFIGS = {
    "Desktop Chrome": {
        "viewport": {"width": 1920, "height": 1080},
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "device_scale_factor": 1,
        "is_mobile": False,
        "has_touch": False,
    },
    "iPhone 12": {
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1",
        "viewport": {"width": 390, "height": 844},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
    "Samsung Galaxy S9+": {
        "user_agent": "Mozilla/5.0 (Linux; Android 8.0.0; SM-G965U Build/R16NW) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36",
        "viewport": {"width": 412, "height": 846},
        "device_scale_factor": 4,
        "is_mobile": True,
        "has_touch": True,
    },
    "iPad Pro 11": {
        "user_agent": "Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1",
        "viewport": {"width": 834, "height": 1194},
        "device_scale_factor": 2,
        "is_mobile": True,
        "has_touch": True,
    },
    # Custom Device Example
    "Samsung Galaxy S22 Ultra": {
        "user_agent": "Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 412, "height": 915},
        "device_scale_factor": 3,
        "is_mobile": True,
        "has_touch": True,
    },
}


# 2. Create a fixture that loops through the KEYS (Names) of the dictionary
@pytest.fixture(params=list(DEVICE_CONFIGS.keys()))
def current_device_name(request):
    """
    This fixture returns the NAME of the device (e.g., 'iPhone 12').
    It is used for naming screenshots and logging.
    """
    return request.param


# 3. Override the default Playwright fixture
@pytest.fixture
def browser_context_args(current_device_name):
    """
    This tells Playwright: 'When you launch the browser, use these settings.'
    It gets the settings by looking up the name in our dictionary.
    """
    print(f"\nSetting up browser context for: {current_device_name}")
    return DEVICE_CONFIGS[current_device_name]


@pytest.fixture(scope="session", autouse=True)
def set_global_expect_timeout():
    """
    Globally increases the timeout for all 'expect()' assertions
    (like to_have_url, to_be_visible) to 10 seconds.
    """
    expect.set_options(timeout=10_000)
