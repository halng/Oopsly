# Authentication Flow

This diagram shows the complete OTP-based authentication process with persistent authentication.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as Mobile App
    participant API as Backend API
    participant Email as Email Service
    participant Storage as Secure Storage
    
    %% Initial Authentication
    User->>UI: Enter email address
    UI->>API: POST /otp (email)
    API->>API: Generate 6-digit OTP
    API->>API: Store OTP with expiry (5 min)
    API->>Email: Send OTP email
    Email-->>User: Receive OTP code
    API-->>UI: Success: OTP sent
    UI-->>User: Show "Check your email" message
    
    User->>UI: Enter OTP code
    UI->>API: POST /otp/validate (email, otp)
    API->>API: Validate OTP & expiry
    API->>API: Generate JWT tokens (access + refresh)
    API-->>UI: Return tokens & user data
    UI->>Storage: Store tokens securely
    UI->>UI: Update auth state
    UI-->>User: Redirect to Home Dashboard
    
    Note over UI,API: Access token expires after 1 hour
    
    %% Token Refresh on API Call
    UI->>API: Request with expired access token
    API-->>UI: 401 Unauthorized
    UI->>API: POST /users/refresh-token (refresh token)
    API->>API: Validate refresh token
    API->>API: Generate new token pair
    API-->>UI: Return new tokens
    UI->>Storage: Update stored tokens
    UI->>API: Retry original request with new token
    
    %% App Restart / Page Refresh
    Note over User,Storage: User refreshes app or closes and reopens
    
    User->>UI: App launches / Page refresh
    UI->>UI: Show loading screen
    UI->>Storage: Check for stored tokens
    Storage-->>UI: Return stored tokens
    
    alt Tokens exist
        UI->>API: GET /users/validate (with access token)
        
        alt Access token valid
            API-->>UI: 200 OK - Token valid
            UI->>UI: Set authenticated state
            UI-->>User: Navigate to Home Dashboard
        else Access token expired
            API-->>UI: 401 Unauthorized
            UI->>API: POST /users/refresh-token (refresh token)
            
            alt Refresh successful
                API-->>UI: Return new token pair
                UI->>Storage: Update stored tokens
                UI->>UI: Set authenticated state
                UI-->>User: Navigate to Home Dashboard
            else Refresh failed
                API-->>UI: 401 Unauthorized
                UI->>Storage: Clear all tokens
                UI->>UI: Clear auth state
                UI-->>User: Navigate to onboarding screen
            end
        end
    else No tokens
        UI->>UI: Clear auth state
        UI-->>User: Show onboarding screen
    end
```

## User Journey

### Initial Authentication

1. User lands on authentication screen
2. User enters email address
3. User receives OTP via email
4. User enters OTP code
5. User is authenticated and redirected to home
6. Tokens are stored securely in device storage

### Persistent Authentication (Page Refresh / App Restart)

1. User refreshes page or reopens app
2. App shows loading screen while checking authentication
3. App retrieves stored tokens from secure storage
4. App validates access token with backend
5. If access token is valid:
   - User is immediately logged in
   - User sees home dashboard
6. If access token is expired but refresh token is valid:
   - App automatically refreshes tokens
   - User is logged in with new tokens
   - User sees home dashboard
7. If both tokens are invalid or missing:
   - Tokens are cleared from storage
   - User is redirected to onboarding

## Key Features

- Email-based OTP system (6-digit code)
- OTP expiry after 5 minutes
- JWT access token (1 hour expiry)
- Refresh token mechanism for seamless session renewal
- **Secure token storage using:**
  - AsyncStorage (React Native async-storage)
  - Uses secure native storage on iOS/Android
  - Uses localStorage on web platform
  - Cross-platform compatible solution
- **Automatic token refresh on expiry**
- **Persistent authentication across app restarts**
- **Token validation on app launch**
- **Loading state during authentication check**
- **Graceful error handling for expired tokens**

## Authentication States

1. **Loading**: Checking for stored credentials
2. **Unauthenticated**: No valid tokens, show onboarding
3. **Authenticated**: Valid tokens, user can access protected routes
4. **Token Refresh**: Automatically refreshing expired access token

## Security Considerations

- Tokens are stored using platform-specific secure storage
- Access tokens have short expiry (1 hour)
- Refresh tokens enable seamless re-authentication
- Failed refresh attempts clear all stored credentials
- Token validation happens on every app launch
- Network errors during validation are handled gracefully
