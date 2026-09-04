# Configure Firebase authentication

This guide connects the Expo client and Spring API to the same Firebase project.

## 1. Configure Firebase Authentication

1. Create or select a Firebase project.
2. In **Authentication → Sign-in method**, enable **Email link (passwordless sign-in)**.
3. Enable **Phone** if the deployment supports reCAPTCHA/native app verification.
4. Add local and deployed UI hosts under **Authentication → Settings → Authorized domains**.
5. Register a web app and copy its web API key.

For phone development, configure Firebase test phone numbers rather than sending real SMS
from automated tests.

## 2. Configure the UI

Set public Expo variables before starting or exporting the app:

```bash
export EXPO_PUBLIC_FIREBASE_API_KEY='firebase-web-api-key'
export EXPO_PUBLIC_FIREBASE_EMAIL_LINK='http://localhost:8081/verification'
export EXPO_PUBLIC_BACKEND_API='http://localhost:9009'
cd ui
pnpm start
```

The email-link URL must exactly match an authorized domain. The UI never receives the
Firebase Admin service account.

## 3. Configure the API

Download a service-account key only for local development and keep it outside the
repository:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/oopsly/firebase-admin.json"
cd api
./gradlew bootRun
```

In production, prefer workload identity or an attached runtime service account. The
service account must be able to verify Firebase Authentication tokens.

## 4. Verify the flow

1. Open the welcome screen and continue to `/login`.
2. Request an email link and open it in the same browser/app context.
3. Confirm a new account is sent to `/profile-setup`.
4. Save the profile and confirm `/profile` shows the contact and hobby fields.
5. Inspect an authenticated API request and confirm it includes a Firebase bearer token.
6. Confirm an expired, revoked, wrong-project, or malformed token receives HTTP 401.

## 5. Configure CD

Add these GitHub Actions values:

- secret `FIREBASE_API_KEY`
- secret `FIREBASE_SERVICE_ACCOUNT`
- repository variable `FIREBASE_PROJECT_ID`
- repository variable `EXPO_PUBLIC_BACKEND_API`

Pushes to `main` and `release/**` run the CD workflow. It builds EAS artifacts, exports
Expo web to `ui/dist`, and deploys that directory to Firebase Hosting.

## Troubleshooting

- **API fails during startup:** Application Default Credentials are missing.
- **Email link rejected:** verify the continue URL and authorized domain.
- **Phone code cannot be sent:** the platform has not completed Firebase app verification
  or the Phone provider is disabled.
- **API returns 401 for a real token:** ensure the UI and Admin credentials belong to the
  same Firebase project and check whether the token was revoked.
