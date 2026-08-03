# Authentication

Oopsly uses **Firebase Authentication** for passwordless sign-in. The client obtains a
Firebase ID token and the API verifies that token with the Firebase Admin SDK on every
protected request. Legacy OTP endpoints remain public, but protected APIs accept Firebase
bearer tokens only.

---

## User flow

```text
Welcome
  → Firebase login (email or phone)
  → Firebase verification
  → new Firebase user? → Profile setup → Home
  → existing user? --------------------→ Home
```

### Email

1. The user enters an email address on `/login`.
2. The UI calls Firebase Identity Toolkit `sendOobCode` with `EMAIL_SIGNIN`.
3. Firebase sends a sign-in link whose continue URL points back to `/verification`.
4. The verification screen exchanges the link's `oobCode` for an ID token and refresh token.

The continue URL must be in Firebase Authentication's **Authorized domains** list and
must match `EXPO_PUBLIC_FIREBASE_EMAIL_LINK`.

### Phone

Firebase phone sign-in requires an app-verification session (reCAPTCHA on web or the
native Firebase app-verification mechanism). After the platform obtains `sessionInfo`,
the verification screen exchanges `sessionInfo` plus the SMS code through
`signInWithPhoneNumber`. Configure the phone provider in Firebase Console before exposing
this option to users.

> The REST service does not bypass Firebase app verification. Production clients must
> supply the platform-generated phone session; Firebase test phone numbers are suitable
> for automated tests.

### First-login profile

Firebase returns `isNewUser` after verification. New users go to `/profile-setup` and
provide a display name plus optional bio, hobbies, and the contact method not used for
login. Saving the profile sets `onboardingComplete=true`. These fields are editable and
visible later on `/profile`.

---

## Token lifecycle

1. Firebase returns an ID token and refresh token after verification.
2. Before a protected API request, the Axios interceptor asks `FirebaseAuthService` for
   the current ID token. The service refreshes it through Firebase Secure Token.
3. The client sends `Authorization: Bearer <firebase-id-token>`.
4. `FirebaseAuthenticationFilter` uses the Firebase Admin SDK to validate signature, expiry,
   revocation status, issuer, and audience.
5. The API finds the local user by `firebase_uid`. On first request it links an existing
   record with the same email or provisions a new record.
6. The local UUID becomes the Spring Security principal, preserving ownership checks in
   existing services.

Firebase Admin uses Application Default Credentials. Set
`GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file locally, or use the
runtime's attached service account in Google-managed environments. Never ship Admin
credentials in the UI bundle.

---

## Public and protected routes

`SecurityConfig` permits the health endpoint, Swagger/OpenAPI, CORS preflight, and legacy
OTP/refresh-token endpoints. Every other endpoint requires authentication unless the
`perf` profile is active.

The UI treats only legacy `otp`, `otp/validate`, and `users/refresh-token` paths as public.
All other requests receive a Firebase ID token when a Firebase session exists.

---

## Profiles

`integration` tests mock `FirebaseTokenVerifier` so backend tests do not require cloud
credentials. The `perf` profile enables a dedicated permissive `SecurityFilterChain` via
`@Profile("perf")` instead of runtime auth flags.
