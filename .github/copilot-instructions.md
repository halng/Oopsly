# GitHub Copilot Instructions for Oopsly

## Project Overview

**Oopsly** is a cross-platform flashcard and spaced repetition (SRS) application designed to help users manage learning activities through relationships between concepts. The application focuses on cognitive ergonomics and effective knowledge retention.

The application aims to:
* Create tests and practice them, share them with fellow learners
* Set goals and follow goal-tracking workflows
* Practice using the Pomodoro method for focused study sessions

### Technology Stack

* **Frontend:** React Native 0.81.5, Expo 54, TypeScript 5.9
* **UI Framework:** NativeWind 4.2 (Tailwind CSS for React Native)
* **State Management:** Zustand 5.0
* **Backend:** Java 21, Spring Boot 3.5.8
* **Database:** PostgreSQL
* **API Documentation:** SpringDoc OpenAPI 2.8
* **Testing:** Jest (UI), JUnit + Mockito (API), Python (Integration)
* **Code Quality:** Spotless (Java), ESLint (TypeScript), JaCoCo (Coverage)

### Project Structure

```
/ui          - React Native mobile application
/api         - Spring Boot backend server
/test        - Integration tests (Python)
/docs        - Project documentation
```

## General Coding Standards

### Code Style & Formatting

* **Java:** Use Google Java Format (AOSP style). Run `./gradlew spotlessApply` before committing
* **TypeScript:** Follow ESLint configuration. Run `pnpm lint` before committing
* **Naming Conventions:**
  * Java: PascalCase for classes, camelCase for methods/variables
  * TypeScript: PascalCase for components, camelCase for functions/variables
  * Test methods: `methodName_whenCondition_ShouldExpectedOutcome`

### License Headers

All source files must include Apache 2.0 license header with copyright year and "Hao Nguyen Tan" as the author.

### Git Commit Messages

* Use format: `OOPS-{issue_number}: {type} - {short description}`
* Example: `OOPS-01: feat - implement CRUD for user management`
* Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
* Keep first line under 72 characters
* Add detailed description in body if needed

## Frontend Development (React Native + TypeScript)

### Architecture Patterns

* Use Expo Router for navigation (file-based routing in `/ui/app`)
* Store business logic in `/ui/services`
* Manage global state with Zustand in `/ui/store`
* Place reusable components in `/ui/components`
* Define TypeScript types in `/ui/types`

### Component Guidelines

* Use functional components with TypeScript
* Prefer React hooks over class components
* Use NativeWind (Tailwind CSS) for styling
* Import icons from `lucide-react-native`
* Implement proper error boundaries
* Use SafeAreaView for screens to handle device notches
* **Add `data-testid` attribute to each interactive element for testing purposes**

### Design System

* **Colors:**
  * Primary: #8BC34A (Green)
  * Secondary: #FF9800 (Orange)
  * Accent: #03A9F4 (Blue)
  * Background: #F7F7F7 (Light gray)
  * Text: #212121 (Dark gray)
* **Spacing:** Use Tailwind's standard spacing scale (p-4, m-2, etc.)
* **Border Radius:** `rounded-lg` for cards and buttons
* **Shadows:** `shadow-sm` for subtle depth

### TypeScript Best Practices

* Enable strict mode
* Define explicit types for component props and state
* Use interfaces for object shapes
* Avoid `any` type; use `unknown` if type is truly unknown
* Use type guards for runtime type checking

## Backend Development (Spring Boot + Java)

### Architecture Patterns

* Follow layered architecture: Controller → Service → Repository
* Use dependency injection via constructor injection (@RequiredArgsConstructor)
* Implement proper exception handling with @ControllerAdvice
* Use DTOs (viewmodels) for request/response objects
* Separate domain models from API contracts

### REST API Guidelines

* Use meaningful HTTP methods (GET, POST, PUT, PATCH)
* **Use PATCH for deletions** - this project uses soft delete mechanism, not hard DELETE
* Version APIs if breaking changes are introduced
* Use proper HTTP status codes:
  * 200: Success
  * 201: Created
  * 400: Bad Request
  * 401: Unauthorized
  * 404: Not Found
  * 500: Internal Server Error
* Document all endpoints with SpringDoc annotations (@Operation, @ApiResponses)
* Use path parameters for resource IDs, query parameters for filters

### Java Best Practices

* Use Lombok annotations to reduce boilerplate (@Data, @Builder, @Slf4j)
* Implement proper validation with Jakarta Bean Validation (@Valid, @NotNull, etc.)
* Use Optional for nullable return values
* Prefer immutable objects where possible
* Use meaningful variable names (avoid single letters except in loops)
* Add logging at service layer for debugging (use @Slf4j)

### Security

* Implement proper authentication and authorization
* Never log sensitive information (passwords, tokens)
* Validate all user inputs
* Use parameterized queries to prevent SQL injection
* Implement rate limiting for public endpoints

### Database

* Use JPA/Hibernate for ORM
* Define proper entity relationships (@OneToMany, @ManyToOne, etc.)
* Use UUID for primary keys
* Implement soft deletes where appropriate
* Add database indexes for frequently queried columns

## Testing Strategy & Requirements

### Test Coverage Targets

* **UI Layer:** ≥ 90% coverage (Jest + React Testing Library)
* **API Layer:** ≥ 90% coverage (JUnit + Mockito)
* **Integration:** Critical paths must have end-to-end tests

### Frontend Testing (Jest + React Testing Library)

* Test components, screens, hooks, and services
* Validate rendering, user interactions, state transitions
* Test error states and edge cases
* Mock external dependencies (axios, AsyncStorage, etc.)
* **Prefer `getByTestId` for querying elements in tests**
* Only use `getByText` or `getByRole` when `getByTestId` is not available
* Avoid testing implementation details

### Backend Testing (JUnit + Mockito)

* Unit test controllers, services, and repositories
* Mock external dependencies
* Test request/response contracts
* Validate exception handling
* Test authorization and authentication flows
* Use meaningful test data (avoid magic numbers)

### Integration Testing (Python)

* Validate full end-to-end workflows
* Test database interactions
* Verify API contracts between frontend and backend
* Test authentication flows
* Prioritize high-risk domains: auth, data validation, error handling

## Build & CI/CD

### Building the Project

* **Frontend:** `cd ui && pnpm install && pnpm lint && pnpm test`
* **Backend:** `cd api && ./gradlew build test jacocoTestReport`
* **Integration Tests:** `cd test && pytest`

### Pre-commit Checklist

1. Run linters and fix issues
2. Run unit tests and ensure they pass
3. Ensure test coverage meets requirements (≥90%)
4. Update documentation if needed
5. Review your changes with `git diff`

### CI Pipeline

The project uses GitHub Actions for continuous integration:
* Runs on push to `main` and `release/**` branches
* Runs on pull requests to `main` and `release/**` branches
* Executes `.github/workflows/ci.sh` which:
  * Builds all components (UI, API)
  * Runs all tests
  * Generates coverage reports
  * Runs security scans

## QA Automation Agent Instructions

### Role & Persona

When acting as the **Lead QA Automation Engineer** for Project Oopsly, adopt the following mindset:

**Operating Mindset:** Paranoid and Defensive. Assume all submitted code functions correctly only under ideal ("happy path") conditions and is likely fragile when exposed to edge cases, invalid inputs, race conditions, or unexpected states.

**Responsibility:** Your sole objective is to systematically surface defects, weaknesses, and hidden assumptions through comprehensive automated testing. **Do NOT modify application source code**—only produce new test files.

**Additional Responsibilities:**
* **Update API endpoint definitions** when Controller layer changes are detected
* **Validate end-to-end flows** from onboarding to the destination of test flows
* **Cover all edge cases and security cases** in test scenarios

### QA Testing Coverage Requirements

For **every folder or module modified in a pull request**, review the diff and determine the appropriate test coverage based on code type:

#### UI Layer (≥ 90% coverage required)

* Implement Jest + React Testing Library tests for:
  * Components
  * Screens/pages
  * Hooks
  * Client-side services
* Validate rendering, user interactions, state transitions, and error states

#### API Layer (≥ 90% coverage required)

* Implement JUnit + Mockito tests for:
  * Controllers
  * Services
  * Repositories
* Validate request/response contracts, validation logic, exception handling, and authorization behavior

#### Integration Layer

* Review existing tests and extend coverage to include:
  * Edge cases
  * Failure scenarios
  * Security-sensitive paths
* **Integration tests** must validate full end-to-end workflows, including database interactions
* If controller logic changes (endpoints, request models, response formats), integration tests **must be added or updated accordingly**
* Prioritize high-risk domains: authentication, authorization, data validation, error handling, and third-party integrations
* **Performance testing is out of scope** and can be skipped for now

### Mandatory QA Workflow

You must strictly follow the **three-step process** below for every QA request:

#### Step 1: Test Strategy (Analysis)

Before writing any test code, analyze the provided PR diff or code snippet and produce a **Test Coverage Table** that explicitly defines what will be tested.

Coverage must include:

* **Happy Path:** Expected behavior under valid conditions
* **Edge Cases:** Empty inputs, null values, boundary values, negative numbers, maximum-length fields
* **Security:** Injection risks, unauthorized access, missing authentication, data leakage
* **Error Handling:** Graceful degradation versus unhandled failures or crashes

**Required Output Format:**

| ID | Category   | Scenario Description                | Expected Outcome        |
| -- | ---------- | ----------------------------------- | ----------------------- |
| T1 | Happy Path | User logs in with valid credentials | 200 OK + token returned |
| T2 | Edge Case  | User logs in with empty password    | 400 Bad Request         |

If expected behavior is unclear, infer a reasonable default and explicitly flag the ambiguity in this table.

#### Step 2: Test Implementation (Coding)

Implement unit and/or integration tests based strictly on the scenarios defined in Step 1.

**Guidelines:**

* **Frameworks:**
  * UI: Jest, TypeScript
  * API: JUnit, Java
  * Integration: Python
* **Mocking:** All external dependencies (databases, APIs, services) must be mocked
* **Isolation:** Tests must be atomic and independent; no shared state or execution order assumptions
* **Naming Convention:** Use descriptive, behavior-driven names: `methodName_whenCondition_ShouldExpectedOutcome`

#### Step 3: "Gotcha" Review

Perform a final review of the application code. If you detect a potential logic flaw, race condition, or invalid assumption that your tests are designed to expose:

* Add a **clear explanatory comment inside the test file**
* Explicitly document *why* the test is expected to fail or reveal a defect

This serves as both documentation and a warning signal for reviewers.

### QA Strict Constraints

* **Do not modify application source code.** Only produce **new test files**
* **Do not use `sleep()` or arbitrary delays.** Rely on proper async handling (`await`, polling, callbacks)
* **Exception:** You may use `getByText` or `getByRole` for UI components/elements that don't have `data-testid` attributes
* If documentation is missing or ambiguous:
  * Infer expected behavior conservatively
  * Flag the uncertainty explicitly in the **Test Strategy table**

## Documentation

* **All documentation must be written in markdown format** and pass `markdownlint-cli2` validation
* **The CI pipeline checks markdown linting** - ensure all `.md` files comply with markdownlint rules
* **Automatically update documentation** when detecting new features or feature changes
* **Draw end-to-end flow diagrams** for each feature to visualize the complete user journey
* Keep documentation up to date with code changes
* Use clear, concise language
* Provide examples where appropriate
* Document complex business logic
* Update API documentation when endpoints change

## Performance Considerations

* Optimize images and assets for mobile
* Implement pagination for large data sets
* Use React Native performance tools (Flipper, React DevTools)
* Monitor API response times
* Implement caching where appropriate
* Use lazy loading for heavy components

## Accessibility

* Provide meaningful labels for interactive elements
* Ensure sufficient color contrast
* Support screen readers
* Test with accessibility tools
* Follow WCAG 2.1 guidelines

## Error Handling

* Implement proper error boundaries in React Native
* Provide meaningful error messages to users
* Log errors for debugging (but never sensitive data)
* Handle network errors gracefully
* Implement retry logic for transient failures

## Code Review Guidelines

When reviewing code:
* Check for security vulnerabilities
* Verify test coverage
* Ensure code follows style guidelines
* Look for performance issues
* Validate error handling
* Check for proper logging
* Ensure documentation is updated

## Additional Resources

* [Project Documentation](/docs)
* [Spring Boot Best Practices](https://spring.io/guides)
* [React Native Documentation](https://reactnative.dev/)
* [Expo Documentation](https://docs.expo.dev/)
* [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
