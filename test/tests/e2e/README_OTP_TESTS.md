# E2E Tests for OTP Onboarding Flow

This directory contains end-to-end tests for the OTP onboarding authentication flow using Playwright and Python.

## Test Coverage

### Page Objects

1. **`pages/onboarding_page.py`** - Page object for the email input screen (`/onboard`)
   - Email input validation
   - Continue button state
   - Navigation to verification page

2. **`pages/verification_page.py`** - Page object for the OTP verification screen (`/verification`)
   - 6-digit OTP input fields
   - Timer countdown
   - Resend functionality
   - Verify button state

### Test Suites

**`suites/test_otp_onboarding.py`** - Comprehensive OTP onboarding flow tests

1. ✅ Onboarding page initial render
2. ✅ Email validation (valid/invalid formats)
3. ✅ Multiple valid email format testing
4. ✅ Navigation from onboarding to verification
5. ✅ Verification page initial render
6. ✅ OTP input validation
7. ✅ Non-numeric character rejection
8. ✅ Timer countdown functionality
9. ✅ Resend OTP UI behavior
10. ✅ Back navigation from verification
11. ✅ Complete UI flow integration test

**Total: 11 test cases covering the entire OTP onboarding UI flow**

## Running the Tests

### Prerequisites

1. Install Python dependencies:
   ```bash
   cd test
   pip install -r requirements.txt
   ```

2. Install Playwright browsers:
   ```bash
   playwright install
   ```

3. Start the Expo development server:
   ```bash
   cd ../ui
   npm start
   ```

### Run Tests

Run all OTP onboarding tests:
```bash
pytest tests/e2e/suites/test_otp_onboarding.py -v
```

Run tests on specific device:
```bash
pytest tests/e2e/suites/test_otp_onboarding.py -k "iPhone" -v
```

Run with visual output:
```bash
pytest tests/e2e/suites/test_otp_onboarding.py --headed -v
```

Run specific test:
```bash
pytest tests/e2e/suites/test_otp_onboarding.py::test_email_validation -v
```

## Test Configuration

Tests run on multiple devices configured in `conftest.py`:
- Desktop Chrome (1920x1080)
- iPhone 12 (390x844)
- Samsung Galaxy S9+ (412x846)
- iPad Pro 11 (834x1194)
- Samsung Galaxy S22 Ultra (412x915)

## Notes

- These tests focus on UI behavior and validation
- Full backend integration tests require a test backend or API mocking
- Timer tests use real-time delays to verify countdown functionality
- All tests follow the Page Object Model pattern for maintainability

## Integration with Backend

For full e2e tests with backend integration:

1. Set up a test backend with OTP endpoints at `http://localhost:9009`
2. Configure test data for OTP codes (use fixed codes in test environment)
3. Uncomment navigation assertions in `test_navigation_to_verification`
4. Add tests for actual OTP verification and user area navigation

Example with backend:
```python
def test_full_otp_flow_with_backend(page):
    # Navigate and enter email
    onboarding = OnboardingPage(page)
    onboarding.navigate(onboarding.url)
    onboarding.enter_email("test@example.com")
    onboarding.click_continue()
    
    # Wait for navigation
    verification = VerificationPage(page)
    verification.wait_for_navigation_to_user_area()
    
    # Enter OTP (use fixed test OTP from backend)
    verification.enter_otp("123456")
    verification.click_verify()
    
    # Verify successful login
    expect(page).to_have_url("**/user")
```
