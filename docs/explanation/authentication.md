# Authentication

Oopsly uses **passwordless email OTP** as the primary Milestone 1 auth path, then issues JWTs for API access.

---

## Flow

```text
1. Client  POST /otp?email=user@example.com
2. API generates OTP, stores it, sends email (SMTP or no-op sender in some envs)
3. Client  POST /otp/validate  { email, otp }
4. API returns access + refresh tokens (and user context in data)
5. Client stores tokens (Secure Store / auth store)
6. Client sends  Authorization: Bearer <access_token>  on protected routes
7. On 401 / expiry  POST /users/refresh-token  with refresh token
8. Logout  POST /users/logout
```

---

## Public vs protected

From `SecurityConfig`:

**Permit all**

- `/otp/**`
- `**/refresh-token`
- `/actuator/health`
- `/swagger-ui/**`, `/api-docs/**`
- `OPTIONS /**`

**Authenticated**

- All other requests (JWT filter)

The UI mirrors public paths in `ui/services/index.ts` (`otp`, `otp/validate`, `users/refresh-token`).

---

## Tokens

Configured in `application.yaml`:

| Token | Property | Default |
| ----- | -------- | ------- |
| Access | `app.jwt.expiration-in-ms` | 24 hours |
| Refresh | `app.jwt.refresh-expiration-in-ms` | 7 days |

Signing secret: `JWT_SECRET` / `app.jwt.secret`. **Always override in non-local environments.**

Refresh-token state is backed by **Redis**.

---

## Google Sign-In

`app.features.authWithGoogle` defaults to **false**. `GOOGLE_CLIENT_ID` is present for a future / optional path; do not assume Google login works unless the flag is enabled and the client implements it.

---

## Client storage

- Zustand auth store holds session state
- Sensitive tokens use Expo Secure Store where applicable
- Axios interceptor attaches the bearer token except on public paths
