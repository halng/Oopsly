---
name: zustand-mobile-auth-state
description: 'Design and review Zustand stores for Oopsly mobile auth and persisted app state. Use when adding auth tokens, persisted user state, AsyncStorage-backed hydration, explicit actions, and Expo-friendly state flows in the ui app.'
argument-hint: 'Describe the store, auth flow, or persisted state change'
user-invocable: true
disable-model-invocation: false
---

# Zustand Mobile Auth State

Use this skill when changing shared mobile state in the `ui/store` layer, especially authentication and persisted state that survives app restarts.

## When to Use
- Creating or refactoring Zustand stores in the UI app
- Adding login, logout, token, or persisted user state behavior
- Reviewing auth-state flows backed by AsyncStorage persistence
- Separating local component state from cross-screen app state

## Core Outcome

Produce Zustand store code that matches Oopsly's mobile state conventions:
- Zustand `create` for store creation
- `persist` plus `createJSONStorage` for state that must survive app restarts
- AsyncStorage as the persistence layer
- Explicit, descriptive state fields and actions
- Auth flows that expose login and logout state transitions clearly
- Screen code that consumes store selectors instead of reaching into storage directly

## Procedure

1. Define whether state is truly shared.
   Use Zustand only for state that crosses screens, survives navigation, or must be shared across multiple components. Keep transient form input and isolated UI toggles in local component state.

2. Model auth state explicitly.
   Use clear fields for authentication status, tokens, and user identity data. Prefer readable names such as `isAuthenticated`, `accessToken`, `refreshToken`, and `userEmail` over generic blobs.

3. Keep actions intentional.
   Add explicit actions such as setting tokens, setting credentials, clearing auth, or updating persisted profile details. Name actions after the state transition they perform.

4. Persist only what should survive restarts.
   Wrap the store with `persist` and `createJSONStorage(() => AsyncStorage)` when restart persistence is required. Do not persist volatile or easily recomputed UI state by default.

5. Keep storage concerns inside the store boundary.
   Screen and component code should consume selectors and actions from the store, not read or write AsyncStorage directly for the same state.

6. Make hydration behavior predictable.
   Consider what the UI should show before persisted auth state is restored, after hydration succeeds, and after logout or token reset flows.

7. Use selectors at call sites.
   Read only the state slices and actions each component needs. Keep component access narrow so screens do not become tightly coupled to the full store shape.

8. Preserve navigation intent after auth transitions.
   Coordinate store actions with Expo Router flows such as redirecting to the authenticated area after login and back to a public route after logout.

9. Test the important transitions.
   Cover login, logout, persisted rehydration, and failure or reset scenarios where user experience depends on store behavior.

10. Finish with repo-required validation.
    Run focused UI tests and lint checks after store changes, especially when auth state affects multiple screens.

## Decision Rules

### If state is only used inside one component
- Keep it local with React state
- Do not move it to Zustand just for consistency

### If state must survive app restart
- Use persisted Zustand with AsyncStorage
- Persist only the minimum durable fields needed to restore the experience

### If adding auth behavior
- Keep tokens and auth identity in the store boundary
- Provide explicit actions for set, clear, and refresh-style transitions
- Make logout fully clear persisted auth data

### If wiring screens to the store
- Consume selectors in components rather than the entire store object
- Keep navigation decisions close to the screen while state mutation logic stays in store actions

## Quality Checks

Treat the work as complete only if all of these are true:
- Shared state is in Zustand only when it truly needs to be shared
- Persisted state uses AsyncStorage through Zustand middleware rather than ad hoc storage calls
- State shape and action names are explicit and readable
- Screens consume narrow selectors instead of broad store objects
- Auth transitions such as login, logout, and hydration are handled deliberately
- Relevant UI lint and tests pass

## Common Failure Modes
- Putting local form state into the global store unnecessarily
- Persisting too much state without a clear restart requirement
- Reading AsyncStorage directly in screens for auth data already owned by the store
- Using vague action names that hide state transitions
- Leaving logout flows with partially persisted credentials
- Coupling components to the entire store shape instead of focused selectors

## Suggested Validation Commands
- `cd ui && pnpm test`
- `cd ui && pnpm lint`

## Example Prompts
- Use the zustand-mobile-auth-state skill to design an auth store for login and logout flows.
- Review this persisted Zustand store for unnecessary global state using the zustand-mobile-auth-state skill.
- Refactor this screen to consume narrow auth selectors with the zustand-mobile-auth-state skill.