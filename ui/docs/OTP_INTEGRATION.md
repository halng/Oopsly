# OTP Backend Integration Setup

## Environment Configuration

The application requires a backend API URL to be configured. This is done through environment variables.

### Setup Steps

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `BACKEND_API` in the `.env` file with your backend API URL:
   ```
   BACKEND_API=http://localhost:9009
   ```
   
   For production, update this to your production API URL.

### HTTP Client

The application uses **Axios** as the HTTP client library for better customization and interceptor support:

- **Base configuration**: `config/axiosClient.ts`
- **Timeout**: 30 seconds
- **Request interceptor**: Can add authentication tokens automatically
- **Response interceptor**: Handles common error responses and network errors
- **Benefits**: Better error handling, request/response transformation, automatic JSON parsing

### API Endpoints

The application uses the following OTP endpoints:

- **Send OTP**: `POST /otp?email={email}`
  - Sends an OTP code to the specified email address
  - Response: `{ status, message, data, isSuccess, timestamp }`

- **Verify OTP**: `POST /otp/validate`
  - Request body: `{ email: string, otp: string }`
  - Response: `{ status, message, data: { access_token, refresh_token, type }, isSuccess, timestamp }`

### Authentication Flow

1. User enters email on the onboarding screen (`/onboard`)
2. Application sends OTP request to backend via axios
3. Backend sends OTP code to user's email
4. User enters OTP code on verification screen (`/verification`)
5. Application verifies OTP with backend via axios
6. On success, backend returns authentication tokens
7. Tokens are stored in Zustand store with AsyncStorage persistence
8. User is redirected to the main app

### Store Structure

Authentication state is managed by Zustand with the following structure:

```typescript
interface AuthState {
  isAuthenticated: boolean;
  userEmail: string;
  accessToken: string;
  refreshToken: string;
  
  setUserEmail: (email: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
  setAuthTokens: (accessToken: string, refreshToken: string) => void;
  setCredentials: (email: string, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}
```

The store is persisted to AsyncStorage under the key `auth-storage`.

## Testing

Run tests with:
```bash
npm test
```

### Test Coverage

All OTP integration tests are included in:
- `app/onboard.test.tsx` - Email input and OTP sending (4 tests)
- `app/verification.test.tsx` - OTP verification (7 tests)
- `store/AuthStore.test.ts` - Authentication store (7 tests)
- `services/otp.test.ts` - OTP service unit tests (16 tests)
- `config/axiosClient.test.ts` - Axios client configuration (3 tests)

**Total: 37 tests covering all functionality**

### Test Cases Covered

#### OTP Service Tests
- ✅ Successful OTP send
- ✅ OTP send with error handling
- ✅ Network error handling
- ✅ Special characters in email
- ✅ Successful OTP verification with tokens
- ✅ Invalid OTP error
- ✅ Expired OTP error
- ✅ Rate limit error
- ✅ Different email formats
- ✅ Empty email/OTP validation
- ✅ Different OTP lengths

#### Axios Client Tests
- ✅ Base URL configuration
- ✅ Timeout configuration
- ✅ Default headers
- ✅ Request interceptor presence
- ✅ Response interceptor presence
