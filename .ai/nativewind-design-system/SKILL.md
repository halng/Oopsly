---
name: nativewind-design-system
description: 'Apply Oopsly mobile design-system rules with NativeWind in the ui folder. Use when styling React Native screens and components, choosing colors, spacing, radius, shadows, responsive layout, accessibility sizing, and keeping a consistent Expo app visual language.'
argument-hint: 'Describe the screen, component, or styling change'
user-invocable: true
disable-model-invocation: false
---

# NativeWind Design System

Use this skill when styling code in the `ui` folder so visual changes stay consistent with Oopsly's React Native and Expo design language.

## When to Use
- Creating or editing React Native screens and components styled with NativeWind
- Refactoring inconsistent className usage into the project's design system
- Reviewing UI work for spacing, color, shadow, border radius, and responsiveness consistency
- Adding accessibility-safe touch targets and mobile layout structure

## Core Outcome

Produce mobile UI styling that matches Oopsly's design rules:
- NativeWind through `className`
- Primary color `#8BC34A`, secondary `#FF9800`, accent `#03A9F4`, background `#F7F7F7`, text `#212121`
- Tailwind spacing scale such as `p-4`, `m-2`, and `gap-3`
- `rounded-lg` for cards and buttons, `rounded-md` for inputs, `rounded-full` for pills
- Shadow choices that stay within `shadow-sm`, `shadow-md`, and `shadow-lg`
- Flexbox-first responsive layout for mobile screens
- Accessible touch targets and text contrast that remain usable on phones

## Procedure

1. Identify the visual surface.
   Decide whether the change belongs to a full screen, reusable component, form control, card, list item, or feedback state such as loading or error.

2. Start from existing design tokens.
   Choose colors, spacing, radius, and shadows from the project's established palette and scale before introducing a new visual treatment.

3. Use NativeWind as the styling path.
   Prefer `className` over ad hoc inline style objects unless a React Native API requires a dynamic style that NativeWind cannot express clearly.

4. Design for mobile layout behavior.
   Use flexbox layouts, avoid fixed widths where possible, and preserve behavior across small and large screens, including portrait and landscape cases when the screen can rotate.

5. Match component semantics to styling.
   Use `rounded-lg` for cards and buttons, `rounded-md` for text inputs, and `rounded-full` only when pill styling is intentional. Keep shadow intensity proportional to importance.

6. Keep spacing systematic.
   Use Tailwind spacing tokens consistently instead of arbitrary spacing values. Favor predictable rhythm between headers, content, form fields, and action areas.

7. Preserve readability and accessibility.
   Maintain sufficient contrast, readable text sizes, and touch targets at least 44x44 points for interactive controls. Add accessibility labels and hints where interaction meaning is not obvious.

8. Fit styling to UI state.
   Ensure loading, empty, success, and error states use the same visual system instead of introducing one-off colors or spacing patterns.

9. Validate testability.
   Keep interactive elements testable with `testID` and avoid styling decisions that remove obvious component boundaries needed for UI tests.

10. Finish with repo-required validation.
    Run the narrowest relevant UI lint and tests after styling changes, especially when styling affects interaction or conditional rendering.

## Decision Rules

### If styling a screen
- Use `SafeAreaView` when content reaches device edges or status bar areas
- Keep layout structure simple and mobile-first
- Use background and spacing tokens that match existing screens

### If styling a button or input
- Keep touch targets large enough for mobile use
- Preserve visible hierarchy between primary and secondary actions
- Use consistent radius and spacing rather than bespoke per-screen controls

### If styling feedback states
- Keep error, loading, and empty states visually consistent with the screen they belong to
- Avoid jarring color or spacing changes that make transient states feel like separate pages

### If considering a custom style escape hatch
- Use it only when NativeWind cannot express the requirement clearly
- Keep the exception local and documented by the surrounding code structure
- Do not introduce a second styling system for convenience

## Quality Checks

Treat the work as complete only if all of these are true:
- Styling uses NativeWind `className` as the default path
- Colors, spacing, radius, and shadows align with the Oopsly design system
- Layout behaves reasonably on different mobile screen sizes
- Interactive controls remain accessible and testable
- New styling does not introduce a one-off visual language for a single screen
- Relevant UI lint and tests pass

## Common Failure Modes
- Mixing inline style objects with NativeWind without a clear reason
- Using arbitrary spacing or color values where existing tokens already fit
- Hard-coding widths that break on smaller devices
- Styling buttons or inputs inconsistently across screens
- Making touch targets too small for mobile interaction
- Treating loading and error states as visual afterthoughts

## Suggested Validation Commands
- `cd ui && pnpm lint`
- `cd ui && pnpm test`

## Example Prompts
- Use the nativewind-design-system skill to restyle this onboarding screen.
- Review this React Native component for design-system violations using the nativewind-design-system skill.
- Apply the nativewind-design-system skill while building a reusable form input component.
