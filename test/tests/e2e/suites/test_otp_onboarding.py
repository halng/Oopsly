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
from playwright.sync_api import expect, Page
from tests.e2e.pages.onboarding_page import OnboardingPage
from tests.e2e.pages.verification_page import VerificationPage


def test_onboarding_page_initial_render(page: Page, current_device_name):
    """
    1. SANITY CHECK: Verify onboarding page loads with all elements
    """
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    
    print(f"[{current_device_name}] Verifying Onboarding Page Elements...")
    
    # Assert page elements are visible
    expect(onboarding.back_button).to_be_visible()
    expect(onboarding.heading).to_be_visible()
    expect(onboarding.description).to_be_visible()
    expect(onboarding.email_input).to_be_visible()
    expect(onboarding.continue_button).to_be_visible()
    
    # Continue button should be disabled initially
    expect(onboarding.continue_button).to_be_disabled()


def test_email_validation(page: Page, current_device_name):
    """
    2. EMAIL VALIDATION: Test email validation logic
    """
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    
    print(f"[{current_device_name}] Testing email validation...")
    
    # Test invalid email
    onboarding.enter_email("invalid-email")
    expect(onboarding.continue_button).to_be_disabled()
    
    # Test valid email
    onboarding.enter_email("test@example.com")
    expect(onboarding.continue_button).to_be_enabled()
    
    # Test another invalid format
    onboarding.email_input.clear()
    onboarding.enter_email("test@")
    expect(onboarding.continue_button).to_be_disabled()


@pytest.mark.parametrize("email", [
    "user@example.com",
    "test+tag@example.com",
    "admin@subdomain.example.co.uk"
])
def test_valid_email_formats(page: Page, current_device_name, email):
    """
    3. VALID EMAIL FORMATS: Test various valid email formats
    """
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    
    print(f"[{current_device_name}] Testing email format: {email}")
    
    onboarding.enter_email(email)
    expect(onboarding.continue_button).to_be_enabled()


def test_navigation_to_verification(page: Page, current_device_name):
    """
    4. NAVIGATION: Test navigation from onboarding to verification page
    Note: This test assumes a mock backend or test environment
    """
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    
    print(f"[{current_device_name}] Testing navigation to verification...")
    
    # Enter valid email and click continue
    onboarding.enter_email("test@example.com")
    onboarding.click_continue()
    
    # Wait for navigation to verification page
    # Note: In real scenario, this would trigger OTP sending
    # For e2e tests, you may need to mock the API or use a test backend
    verification = VerificationPage(page)
    expect(page).to_have_url(verification.url, timeout=15000)


def test_verification_page_initial_render(page: Page, current_device_name):
    """
    5. SANITY CHECK: Verify verification page loads with all elements
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Verifying Verification Page Elements...")
    
    # Assert page elements are visible
    expect(verification.back_button).to_be_visible()
    expect(verification.heading).to_be_visible()
    expect(verification.verify_button).to_be_visible()
    expect(verification.resend_link).to_be_visible()
    
    # Verify all 6 OTP input fields are present
    for i in range(1, 7):
        expect(verification.get_otp_input(i)).to_be_visible()
    
    # Verify button should be disabled initially
    expect(verification.verify_button).to_be_disabled()


def test_otp_input_validation(page: Page, current_device_name):
    """
    6. OTP INPUT: Test OTP input behavior and validation
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Testing OTP input...")
    
    # Enter partial OTP (should keep button disabled)
    verification.get_otp_input(1).fill("1")
    verification.get_otp_input(2).fill("2")
    verification.get_otp_input(3).fill("3")
    expect(verification.verify_button).to_be_disabled()
    
    # Complete OTP (should enable button)
    verification.get_otp_input(4).fill("4")
    verification.get_otp_input(5).fill("5")
    verification.get_otp_input(6).fill("6")
    expect(verification.verify_button).to_be_enabled()


def test_otp_non_numeric_rejection(page: Page, current_device_name):
    """
    7. OTP VALIDATION: Test that non-numeric characters are rejected
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Testing non-numeric input rejection...")
    
    # Try to enter a letter
    verification.get_otp_input(1).fill("a")
    
    # The value should remain empty (rejected by the input handler)
    expect(verification.get_otp_input(1)).to_have_value("")


def test_timer_countdown(page: Page, current_device_name):
    """
    8. TIMER: Verify timer countdown is working
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Testing timer countdown...")
    
    # Initial timer should show 02:00 (2 minutes)
    timer_text = verification.get_timer_text()
    assert timer_text == "02:00", f"Expected timer to start at 02:00, got {timer_text}"
    
    # Wait a bit and verify timer decreases
    page.wait_for_timeout(2000)  # Wait 2 seconds
    new_timer_text = verification.get_timer_text()
    assert new_timer_text != "02:00", "Timer should have decreased"


def test_resend_functionality(page: Page, current_device_name):
    """
    9. RESEND: Test resend OTP functionality
    Note: This test checks UI behavior, actual OTP resending requires backend
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Testing resend functionality...")
    
    # Initially, resend should be disabled (gray)
    expect(verification.resend_link).to_be_visible()
    
    # The resend link should have gray color initially
    resend_classes = verification.resend_link.get_attribute("class") or ""
    assert "text-gray-400" in resend_classes, "Resend should be grayed out initially"


def test_back_navigation_from_verification(page: Page, current_device_name):
    """
    10. NAVIGATION: Test back button on verification page
    """
    verification = VerificationPage(page)
    verification.navigate(verification.url)
    
    print(f"[{current_device_name}] Testing back navigation...")
    
    # Click back button
    verification.back_button.click()
    
    # Should navigate back to onboarding
    onboarding = OnboardingPage(page)
    expect(page).to_have_url(onboarding.url, timeout=5000)


def test_complete_otp_flow_ui(page: Page, current_device_name):
    """
    11. INTEGRATION: Test complete UI flow from onboarding to verification
    Note: This tests UI flow only, not actual API integration
    """
    print(f"[{current_device_name}] Testing complete OTP flow UI...")
    
    # Step 1: Navigate to onboarding
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    
    # Step 2: Enter email
    expect(onboarding.heading).to_be_visible()
    onboarding.enter_email("e2e-test@example.com")
    expect(onboarding.continue_button).to_be_enabled()
    
    # Note: In a full e2e test with backend, you would:
    # - Click continue
    # - Wait for navigation to verification
    # - Enter OTP
    # - Verify navigation to user area
    # This requires a test backend or API mocking
