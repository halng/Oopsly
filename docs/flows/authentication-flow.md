# Authentication Flow

This diagram shows the complete OTP-based authentication process.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as Mobile App
    participant API as Backend API
    participant Email as Email Service
    
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
    UI->>UI: Store tokens securely
    UI-->>User: Redirect to Home Dashboard
    
    Note over UI,API: Access token expires after 1 hour
    
    UI->>API: Request with expired access token
    API-->>UI: 401 Unauthorized
    UI->>API: POST /users/refresh-token (refresh token)
    API->>API: Validate refresh token
    API->>API: Generate new token pair
    API-->>UI: Return new tokens
    UI->>UI: Update stored tokens
    UI->>API: Retry original request with new token
```

## User Journey

1. User lands on authentication screen
2. User enters email address
3. User receives OTP via email
4. User enters OTP code
5. User is authenticated and redirected to home

## Key Features

- Email-based OTP system (6-digit code)
- OTP expiry after 5 minutes
- JWT access token (1 hour expiry)
- Refresh token mechanism for seamless session renewal
- Secure token storage
- Automatic token refresh on expiry
