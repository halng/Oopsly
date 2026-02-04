# Authentication Persistence UI Flow

This document demonstrates the UI behavior of the authentication persistence feature.

## Loading State (Initial Check)

When the app launches or the page is refreshed, users see a loading screen while the app checks for stored credentials.

### UI Components (from `ui/app/_layout.tsx`, lines 122-134)

```tsx
// Show loading screen while checking auth
if (!isReady) {
  return (
    <View
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      testID="auth-loading-screen"
    >
      <ActivityIndicator size="large" color="#5B5BFD" testID="auth-loading-spinner" />
      <Text style={{ marginTop: 16, color: "#6B7280" }} testID="auth-loading-text">
        Loading...
      </Text>
    </View>
  );
}
```text

### Visual Description

```text
┌─────────────────────────────────┐
│                                 │
│                                 │
│                                 │
│         ⟳ [Spinner]            │
│         (Purple #5B5BFD)        │
│                                 │
│          Loading...             │
│         (Gray #6B7280)          │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
```text

## Authentication Check Flow

### Scenario 1: Valid Tokens Found

**Console Output:**

```text
DEBUG | RootLayout | Checking auth status...
DEBUG | RootLayout | Tokens found, validating...
DEBUG | AuthService | Validating access token...
DEBUG | AuthService | Access token validation successful
INFO  | RootLayout | Access token is valid
DEBUG | RootLayout | RootLayout rendered, isAuthenticated: true
```text

**Result:**

- User is automatically redirected to `/home`
- No login required
- Seamless experience

**Visual Flow:**

```text
Launch App
    ↓
Show Loading Screen (< 1 sec)
    ↓
Validate Token ✓
    ↓
Redirect to Home Dashboard
```text

### Scenario 2: Expired Access Token, Valid Refresh Token

**Console Output:**

```text
DEBUG | RootLayout | Checking auth status...
DEBUG | RootLayout | Tokens found, validating...
DEBUG | AuthService | Validating access token...
DEBUG | AuthService | Access token validation failed
WARN  | RootLayout | Access token validation failed, attempting refresh...
DEBUG | AuthService | Attempting to refresh access token...
DEBUG | AuthService | Token refresh successful
INFO  | RootLayout | Token refreshed successfully
DEBUG | RootLayout | RootLayout rendered, isAuthenticated: true
```text

**Result:**

- Tokens automatically refreshed
- User stays logged in
- Redirected to `/home`

**Visual Flow:**

```text
Launch App
    ↓
Show Loading Screen (< 2 sec)
    ↓
Validate Token ✗
    ↓
Refresh Token ✓
    ↓
Update Stored Tokens
    ↓
Redirect to Home Dashboard
```text

### Scenario 3: No Tokens or Invalid Tokens

**Console Output:**

```text
DEBUG | RootLayout | Checking auth status...
DEBUG | RootLayout | No tokens found in storage
DEBUG | RootLayout | RootLayout rendered, isAuthenticated: false
```text

OR (for invalid tokens):

```text
DEBUG | RootLayout | Checking auth status...
DEBUG | RootLayout | Tokens found, validating...
DEBUG | AuthService | Validating access token...
DEBUG | AuthService | Access token validation failed
WARN  | RootLayout | Access token validation failed, attempting refresh...
DEBUG | AuthService | Attempting to refresh access token...
DEBUG | AuthService | Token refresh failed
ERROR | RootLayout | Token refresh error: [error details]
DEBUG | RootLayout | RootLayout rendered, isAuthenticated: false
```text

**Result:**

- Tokens cleared from storage
- User redirected to onboarding
- Fresh login required

**Visual Flow:**

```text
Launch App
    ↓
Show Loading Screen (< 1 sec)
    ↓
No Tokens Found / Validation Failed
    ↓
Clear Stored Credentials
    ↓
Redirect to Onboarding Screen
```text

## Onboarding Screen Flow

When redirected to onboarding, users see the welcome carousel:

```text
┌─────────────────────────────────┐
│                        [Skip]   │
│                                 │
│      [Welcome Image]            │
│                                 │
│    Welcome to Oopsly            │
│                                 │
│  The smart way to study and     │
│  retain information efficiently │
│                                 │
│         • • •                   │
│                                 │
│      [◀]         [▶]           │
└─────────────────────────────────┘
```text

Then proceed to email input screen:

```text
┌─────────────────────────────────┐
│  [←]                            │
│                                 │
│  What's your email?             │
│                                 │
│  We'll send you a secure code   │
│  to verify your account.        │
│                                 │
│  ┌──────────────────────────┐  │
│  │ name@example.com         │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │      Continue            │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
```text

## Home Dashboard (Authenticated State)

After successful authentication, users see the home dashboard:

```text
┌─────────────────────────────────┐
│  Home        [Profile] [Menu]   │
│                                 │
│  Welcome back!                  │
│                                 │
│  Your Shelves                   │
│  ┌──────────┐  ┌──────────┐   │
│  │ Shelf 1  │  │ Shelf 2  │   │
│  │ 5 cards  │  │ 8 cards  │   │
│  └──────────┘  └──────────┘   │
│                                 │
│  Recent Activity                │
│  • Studied "Math" - 2 hrs ago  │
│  • Created card - 5 hrs ago    │
│                                 │
└─────────────────────────────────┘
```text

## Key UI Features

### 1. Loading Indicator

- **Color:** Purple (#5B5BFD) matching app theme
- **Duration:** < 2 seconds in most cases
- **Purpose:** Prevents flash of wrong screen

### 2. Smooth Transitions

- No jarring redirects
- Loading state prevents screen flashing
- Navigation happens after auth check completes

### 3. Error States

All handled gracefully:

- Network errors → retry with refresh token
- Invalid tokens → clear and redirect
- No tokens → show onboarding

### 4. Persistence Indicators

Users can verify persistence by:

1. Logging in
2. Refreshing browser (web) or restarting app (native)
3. Observing they stay logged in (see loading screen briefly, then home)

## Testing the UI

### Manual Test Steps

1. **Fresh Login Test**
   - Open app for first time
   - Complete OTP authentication
   - Refresh page → Should stay logged in ✓

2. **Token Refresh Test**
   - Wait for access token to expire (1 hour)
   - Make an API call
   - Should auto-refresh without user noticing ✓

3. **Invalid Token Test**
   - Manually corrupt tokens in storage
   - Refresh page
   - Should redirect to onboarding ✓

4. **No Token Test**
   - Clear all tokens from storage
   - Refresh page
   - Should show onboarding immediately ✓

## Code Reference

- **Loading State:** `ui/app/_layout.tsx` lines 122-134
- **Auth Check Logic:** `ui/app/_layout.tsx` lines 38-104
- **Navigation Logic:** `ui/app/_layout.tsx` lines 106-119
- **Token Validation:** `ui/services/AuthService.ts` lines 59-69
- **Token Refresh:** `ui/services/AuthService.ts` lines 71-83

## Visual States Summary

| State                          | Loading Screen | Destination | Duration |
|--------------------------------|----------------|-------------|----------|
| Valid tokens                   | Yes            | Home        | ~1s      |
| Expired access, valid refresh  | Yes            | Home        | ~2s      |
| No tokens                      | Yes            | Onboarding  | ~1s      |
| Invalid tokens                 | Yes            | Onboarding  | ~2s      |
| Network error                  | Yes            | Onboarding  | ~3s      |

All states provide feedback through console logs for debugging.
