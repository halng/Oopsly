---
name: jest-react-native-testing
description: 'Write and review UI tests for Oopsly using Jest and React Native Testing Library. Use when testing Expo Router screens, React Native components, user interactions, async flows, navigation, mocked services, and testID-driven selectors in the ui app.'
argument-hint: 'Describe the component, screen, or behavior to test'
user-invocable: true
disable-model-invocation: false
---

# Jest React Native Testing

Use this skill when writing or reviewing automated tests for code in the `ui` folder.

## When to Use
- Adding tests for screens, components, hooks, or service-driven UI behavior
- Fixing flaky or brittle React Native Testing Library tests
- Reviewing whether a UI change has enough coverage for user-visible behavior
- Validating navigation, async loading, forms, and error states in the Expo app

## Core Outcome

Produce UI tests that match Oopsly's testing rules:
- Jest plus `@testing-library/react-native`
- Descriptive `it()` or `test()` names
- `getByTestId` as the preferred query for interactive elements
- Mocked AsyncStorage, router, API services, and other external dependencies
- Coverage of rendering, interaction, async behavior, and error states
- Minimum UI coverage target above 80 percent

## Procedure

1. Identify the observable behavior.
   Define what the user sees or does: rendering, loading, form entry, button press, navigation, error handling, or persisted state recovery.

2. Choose the narrowest test surface.
   Test a component, screen, or hook at the smallest level that still proves the behavior. Avoid broad end-to-end simulation when a focused component or screen test will falsify the same behavior faster.

3. Stabilize selectors first.
   Add or use `testID` on interactive elements and prefer `getByTestId` for buttons, inputs, and pressables. Use text or role queries only when a stable `testID` is unavailable or not appropriate.

4. Mock external boundaries.
   Mock AsyncStorage, services, network calls, router navigation, and any platform-specific dependency that is not the behavior under test.

5. Test behavior, not implementation details.
   Assert on rendered output, state visible to the user, callback effects, and navigation results rather than internal methods or hook internals.

6. Cover async transitions explicitly.
   Use `waitFor` for data loading, submission, delayed rendering, and other async state changes. Verify loading and failure paths, not just the happy path.

7. Include error and empty-state coverage.
   Add tests for rejected service calls, invalid input, missing data, or auth redirects when the feature can fail that way.

8. Keep test descriptions readable.
   Write `it()` blocks that describe the expected behavior in plain language and make failures understandable without opening the component source.

9. Avoid brittle assertions.
   Do not overfit tests to layout structure, implementation-specific wrappers, or incidental text that is likely to change without changing behavior.

10. Finish with repo-required validation.
    Run the narrowest relevant test command, then rerun UI lint if the test changes required production code changes such as adding `testID` or accessibility props.

## Decision Rules

### If testing a form
- Query inputs and submit controls by `testID`
- Simulate text entry and press events with `fireEvent`
- Assert validation, success, and error behavior

### If testing async data loading
- Mock the service response
- Assert loading state first when the component exposes one
- Use `waitFor` to verify the final success or error UI

### If testing navigation
- Mock Expo Router hooks such as `useRouter()`
- Assert route changes like `replace` or `push` rather than implementation internals

### If testing persisted auth or store-backed behavior
- Mock AsyncStorage and store setup boundaries deliberately
- Prove what the user experiences after hydration, login, logout, or token failure paths

## Quality Checks

Treat the work as complete only if all of these are true:
- Tests target user-visible behavior
- Interactive queries use `getByTestId` where appropriate
- External dependencies are mocked cleanly
- Async behavior uses `waitFor` or equivalent timing-safe assertions
- Error or failure states are covered when they are part of the feature
- Test descriptions are specific and readable
- Relevant UI tests pass

## Common Failure Modes
- Using brittle text selectors for interactive controls that should have `testID`
- Asserting implementation details instead of observable behavior
- Forgetting to mock router, AsyncStorage, or API boundaries
- Missing loading or error-state coverage for async components
- Writing a single oversized test instead of a few focused ones
- Ignoring coverage gaps after changing interaction logic

## Suggested Validation Commands
- `cd ui && pnpm test`
- `cd ui && pnpm lint`

## Example Prompts
- Use the jest-react-native-testing skill to add tests for this login screen.
- Review this UI test file for brittleness using the jest-react-native-testing skill.
- Generate focused Jest and React Native Testing Library tests for this async profile screen.
