---
name: java-coding-convention
description: 'Apply Oopsly backend Java coding conventions for Spring Boot code. Use when creating or reviewing controllers, services, repositories, DTOs, entities, validation, logging, tests, and formatting decisions in the API module.'
argument-hint: 'Describe the Java change, file, or review target'
user-invocable: true
disable-model-invocation: false
---

# Java Coding Convention

Use this skill when working on backend Java code in the API module and you need repo-specific conventions instead of generic Spring Boot advice.

## When to Use
- Adding or editing Java classes in controllers, services, repositories, DTOs, entities, configuration, or exception handling
- Reviewing backend code for convention drift before opening a PR
- Generating tests for Java code that should match this repository's style
- Refactoring API code while preserving the project's architecture and naming rules

## Core Outcome

Produce Java changes that match Oopsly's backend conventions:
- Spring Boot 3 + Java 21 style
- Layered architecture: Controller -> Service -> Repository
- Constructor injection with Lombok
- DTO-based API contracts
- Jakarta Bean Validation for input checks
- Optional for nullable return values
- Soft delete semantics where deletion behavior is required
- Logging in the service layer without exposing secrets
- Spotless-compatible formatting using Google Java Format AOSP style

## Google Java Format Style

Apply backend formatting as if `google-java-format` is the source of truth and `./gradlew spotlessApply` is the enforcement step.

- Do not hand-format code against personal preferences if Spotless will rewrite it
- Preserve standard Google Java Format wrapping and indentation instead of aligning parameters, fields, or chained calls manually
- Keep imports clean and let the formatter and existing build tooling control ordering and spacing
- Prefer small, readable methods over formatting workarounds that only exist to avoid line wrapping
- Avoid vertical padding that separates every statement block; keep blank lines meaningful and minimal
- When touching a file, leave it in a formatter-clean state rather than mixing logic changes with inconsistent local formatting

## Procedure

1. Identify the change surface.
   Decide whether the task belongs in controller, service, repository, DTO/view model, entity, exception handling, or configuration code.

2. Preserve the architecture boundary.
   Keep transport concerns in controllers, business rules in services, and persistence concerns in repositories. Do not let controllers contain business logic or repositories return API response shapes.

3. Choose the right contract type.
   Use DTOs for request and response payloads. Keep domain models separate from API contracts.

4. Apply dependency and boilerplate conventions.
   Prefer constructor injection. Use Lombok where it removes boilerplate cleanly, especially `@RequiredArgsConstructor`, `@Builder`, and `@Slf4j` when appropriate.

5. Validate inputs explicitly.
   Use Jakarta Bean Validation annotations such as `@Valid`, `@NotNull`, and related constraints on incoming request models. Reject invalid data at the boundary.

6. Handle nullability deliberately.
   Use `Optional` for nullable return values instead of returning null from service or repository APIs where absence is expected.

7. Implement deletion behavior carefully.
   If the change involves deletion, prefer the project's soft delete approach and expose it through PATCH-oriented API behavior rather than hard DELETE semantics unless the codebase already proves an exception.

8. Add logging only where it helps operations.
   Log meaningful state transitions and debugging information in the service layer. Never log passwords, tokens, or other sensitive values.

9. Keep names and structure readable.
   Use PascalCase for classes, camelCase for methods and variables, and descriptive names over abbreviations. Avoid single-letter names except trivial loop indices.

10. Apply formatter-first cleanup.
   Before final validation, make sure the file layout, wrapping, imports, and spacing are compatible with Google Java Format AOSP style instead of a custom local style.

11. Finish with repository-required validation.
    Run Spotless formatting and the narrowest relevant backend tests before considering the change complete.

## Decision Rules

### If adding an endpoint
- Use the correct HTTP method for the behavior
- Use path parameters for resource identifiers and query parameters for filtering
- Document endpoints with SpringDoc annotations when the surrounding code does so
- Return appropriate HTTP status codes such as 200, 201, 400, 401, 404, and 500

### If changing request or response shapes
- Prefer DTOs rather than exposing entities directly
- Add validation annotations to request fields
- Keep backward compatibility in mind before renaming or removing fields

### If changing service logic
- Keep orchestration and business rules in the service layer
- Add targeted logging where failures or important state transitions matter
- Avoid pushing business decisions into controllers or repositories

### If changing persistence code
- Use JPA and Hibernate patterns already present in the codebase
- Preserve entity relationship annotations deliberately
- Prefer UUID primary keys and indexing patterns already used in the project

### If writing tests
- Use JUnit and Mockito for backend unit tests
- Name tests as `methodName_whenCondition_ShouldExpectedOutcome`
- Cover success paths, validation failures, exception handling, and authorization-sensitive behavior where relevant

## Quality Checks

Treat the work as complete only if all of these are true:
- The code stays within the correct architectural layer
- Request and response models are DTO-based where API boundaries are involved
- Validation annotations cover external input
- Nullability handling is explicit and does not rely on ad hoc null checks alone
- Logging is useful and does not expose sensitive information
- Deletion flows respect soft delete conventions when applicable
- Naming is descriptive and consistent with Java conventions
- Formatting matches Google Java Format AOSP style and is compatible with `./gradlew spotlessApply`
- Relevant backend tests pass

## Common Failure Modes
- Putting business rules in controllers
- Returning entities directly from REST endpoints
- Adding field validation in service code but not at the request boundary
- Using hard delete semantics in a soft delete flow
- Logging secrets or raw credentials
- Returning null where `Optional` communicates absence more clearly
- Manually preserving custom indentation or alignment that conflicts with Google Java Format
- Skipping formatter or narrow backend tests after code changes

## Suggested Validation Commands
- `cd api && ./gradlew spotlessApply`
- `cd api && ./gradlew test`
- `cd api && ./gradlew build`

## Example Prompts
- Apply the java-coding-convention skill while adding a Spring Boot service for deck progress tracking.
- Review this controller against the java-coding-convention skill and list violations.
- Refactor this repository and service pair to follow the java-coding-convention skill.
- Generate JUnit tests for this service using the java-coding-convention skill.