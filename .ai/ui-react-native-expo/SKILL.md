---
name: ui-react-native-expo
description: 'Work on Oopsly UI code in the ui folder using React Native, Expo Router, NativeWind, Zustand, TypeScript, and Jest. Use when creating or reviewing screens, components, services, stores, navigation, styling, and tests for the mobile app.'
argument-hint: 'Describe the ui change, screen, component, or review target'
user-invocable: true
disable-model-invocation: false
---

# UI React Native Expo

Use this skill when making changes inside the `ui` folder so the work follows Oopsly's Expo and React Native conventions rather than default web React habits.

## When to Use
- Adding or editing Expo Router screens under `ui/app`
- Creating reusable React Native components under `ui/components`
- Updating API integration code under `ui/services`
- Changing Zustand state in `ui/store`
- Defining or refining TypeScript models in `ui/types`
- Writing or reviewing Jest and React Native Testing Library tests in the UI app

## Core Outcome

Produce UI changes that match Oopsly's mobile app conventions:
- React Native with Expo Router file-based navigation
- Functional components with TypeScript
- NativeWind styling through `className`
- Zustand for global state
- Services for API communication
- `testID` on interactive elements for testing
- Safe mobile layouts with `SafeAreaView` where screens need notch-safe rendering
- API response handling that checks `isSuccess` before using `data`
- Validation through lint and relevant UI tests before completion

## Procedure

1. Identify the owning layer.
   Decide whether the change belongs in a screen, reusable component, service, store, type definition, utility, or test. Keep screen concerns in `ui/app`, shared presentation in `ui/components`, data access in `ui/services`, and shared state in `ui/store`.

2. Respect Expo Router structure.
   Use file-based routing under `ui/app`. Put protected user flows in route groups such as `(user)` when the existing app structure expects authentication boundaries.

3. Build for React Native first.
   Use React Native primitives and mobile interaction patterns rather than assuming browser-only behavior. Prefer `SafeAreaView` for top-level screens that need device-safe padding.

4. Keep components typed and focused.
   Use functional components, explicit TypeScript interfaces for props, and descriptive names. Extract reusable UI instead of duplicating view code across screens.

5. Style with NativeWind, not ad hoc inline styling.
   Use `className` with the existing design tokens and spacing scale. Preserve the project's color direction, rounded corners, and shadow usage instead of inventing a new UI language.

6. Route data through the right abstraction.
   Put API calls in services, not directly in screens. Use Zustand for shared app state and local component state for local interaction concerns.

7. Handle API responses defensively.
   Check `isSuccess` before using `data`. Surface user-facing failures with actionable messages and handle Axios-style errors without leaking implementation detail.

8. Preserve navigation and auth flow intent.
   Use Expo Router navigation APIs such as `useRouter()` and prefer route transitions that match existing patterns like `replace` after login or logout flows.

9. Add testing hooks while coding.
   Add `testID` to interactive elements. Make components and screens testable without relying on brittle text-only selectors.

10. Write or update focused tests.
    Use Jest with React Native Testing Library. Test rendering, user interactions, async behavior, and error states. Mock external dependencies such as navigation, AsyncStorage, and API services.

11. Finish with repo-required validation.
    Run the narrowest relevant UI lint and test commands before considering the work complete.

## Decision Rules

### If adding a new screen
- Place it under `ui/app` so Expo Router can own navigation
- Use `SafeAreaView` when the screen reaches device edges or status bar areas
- Keep screen files focused on composition and event wiring, not API and persistence logic

### If adding a reusable component
- Place it under `ui/components`
- Define a clear props interface
- Add `testID` to buttons, inputs, and other interactive controls
- Keep the component presentational unless shared behavior truly belongs there

### If adding data fetching or mutation
- Put network calls in `ui/services`
- Return typed results that match the shared API response structure
- Check `isSuccess` before consuming payloads
- Handle loading, success, and failure states explicitly in the caller

### If adding shared state
- Use Zustand in `ui/store`
- Keep actions explicit and names descriptive
- Persist only the state that should survive app restarts

### If changing navigation
- Use `useRouter()` from `expo-router`
- Preserve route group intent such as authenticated sections under `(user)`
- Prefer navigation changes that match the current app flow instead of introducing a second pattern

### If writing tests
- Prefer `getByTestId` for queries
- Test user-observable behavior instead of component internals
- Mock network, storage, and router dependencies
- Use descriptive `it()` blocks that explain the expected outcome

## Quality Checks

Treat the work as complete only if all of these are true:
- The change lives in the correct UI layer
- Navigation follows Expo Router file-based conventions
- Components use explicit TypeScript types
- Interactive elements expose `testID`
- Styling uses NativeWind conventions consistent with the existing design system
- Shared state and API calls are not embedded directly into unrelated screens or components
- API responses are checked for `isSuccess` before `data` is consumed
- Error handling gives the user a useful message
- Relevant UI lint and tests pass

## Common Failure Modes
- Writing web React patterns that do not fit React Native or Expo Router
- Fetching data directly inside multiple screens instead of using services
- Forgetting `testID` on buttons, inputs, and pressable elements
- Using `getByText` where `getByTestId` should be the stable selector
- Mixing global state into components that only need local state
- Accessing `response.data` without checking `response.isSuccess`
- Adding styling that breaks the existing NativeWind design language
- Skipping UI tests after changing interactive behavior

## Suggested Validation Commands
- `cd ui && pnpm lint`
- `cd ui && pnpm test`

## Example Prompts
- Use the ui-react-native-expo skill to add an authenticated profile screen in the ui app.
- Review this Expo Router screen against the ui-react-native-expo skill and list violations.
- Refactor this React Native component and service to match the ui-react-native-expo skill.
- Generate Jest tests for this login screen using the ui-react-native-expo skill.