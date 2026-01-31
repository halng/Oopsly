# Test Strategy for PR #60: Backend Integration and Refactoring

## Executive Summary

PR #60 introduces significant changes to the Oopsly backend API, including:
1. **JWT Authentication Filter** - Enhanced error handling and MDC logging
2. **Entity Renaming** - `Shelve` → `Shelf` across all layers
3. **New Feature** - Subject settings endpoint with validation
4. **Security Changes** - Case-insensitive header handling, error responses

This document outlines a comprehensive test strategy covering happy paths, edge cases, security concerns, and error handling.

---

## High-Risk Areas Identified

### 1. **JwtAuthenticationFilter** (CRITICAL - Security Component)
**Changes:**
- Added MDC context management with X-Request-ID header
- Changed header name from "Authorization" to lowercase "authorization"
- Added try-catch exception handling
- Introduced `sendErrorResponse` method
- MDC cleanup in finally block

**Risk:** Authentication bypass, memory leaks, unauthorized access

### 2. **SubjectController & SubjectService** (HIGH - New Endpoint)
**Changes:**
- New endpoint: `PUT /shelves/{shelfId}/subjects/{id}/settings`
- New request DTO: `SubjectSettingReq(int dailyLimit, int newCardsPerDay, double interval)`
- No input validation on numeric fields
- Entity relationships updated (Shelve → Shelf)

**Risk:** Invalid data persistence, negative values, boundary violations

### 3. **Entity Renaming** (MEDIUM - Breaking Change)
**Changes:**
- Renamed: `ShelveEntity` → `ShelfEntity`
- Renamed: `ShelveRepository` → `ShelfRepository`
- Updated all references in controllers, services, tests

**Risk:** Missed refactoring, inconsistent naming, test failures

---

## Test Coverage Table

### A. JwtAuthenticationFilter Tests

| ID | Category | Scenario Description | Input | Expected Outcome | Test Method |
|----|----------|---------------------|-------|-----------------|-------------|
| JWT-T1 | Happy Path | Valid JWT with correct format | Bearer valid-token | Authentication succeeds, user context set | `authenticateWithValidToken_shouldSetSecurityContext` |
| JWT-T2 | Edge Case | Missing Authorization header | No header | Request passes through, no authentication | `missingAuthHeader_shouldPassThrough` |
| JWT-T3 | Edge Case | Lowercase "authorization" header | authorization: Bearer token | Should work (case-insensitive) | `lowercaseAuthHeader_shouldAuthenticate` |
| JWT-T4 | Edge Case | Uppercase "AUTHORIZATION" header | AUTHORIZATION: Bearer token | Should NOT work (only lowercase handled) | `uppercaseAuthHeader_shouldNotAuthenticate` |
| JWT-T5 | Edge Case | Empty Authorization header value | Authorization: "" | Request passes through | `emptyAuthHeader_shouldPassThrough` |
| JWT-T6 | Edge Case | Malformed Bearer prefix | Authorization: bearer token (lowercase b) | Request passes through | `malformedBearerPrefix_shouldPassThrough` |
| JWT-T7 | Edge Case | Missing Bearer prefix | Authorization: token-only | Request passes through | `missingBearerPrefix_shouldPassThrough` |
| JWT-T8 | Edge Case | Null X-Request-ID header | No X-Request-ID | MDC should handle null gracefully | `nullRequestId_shouldNotCrash` |
| JWT-T9 | Security | Expired JWT token | Bearer expired-token | 401 Unauthorized + error JSON | `expiredToken_shouldReturnUnauthorized` |
| JWT-T10 | Security | Invalid JWT signature | Bearer tampered-token | 401 Unauthorized + error JSON | `invalidSignature_shouldReturnUnauthorized` |
| JWT-T11 | Security | JWT with null userId | Token with null subject claim | Authentication skipped, no context set | `nullUserId_shouldNotSetContext` |
| JWT-T12 | Security | JWT with null role | Token with null role claim | Authentication skipped or default role | `nullRole_shouldHandleGracefully` |
| JWT-T13 | Error Handling | Exception during JWT parsing | Malformed JWT structure | 401 response with error message | `malformedJwt_shouldReturnUnauthorized` |
| JWT-T14 | Error Handling | MDC cleanup verification | Any request | MDC.clear() called in finally block | `mdcClearedAfterRequest` |
| JWT-T15 | Security | SQL Injection in JWT claims | userId: "'; DROP TABLE--" | Token rejected, no SQL executed | `sqlInjectionInClaims_shouldReject` |
| JWT-T16 | Edge Case | Extremely long JWT token | Bearer [10000 chars] | Should handle or reject gracefully | `extremelyLongToken_shouldHandle` |
| JWT-T17 | Race Condition | Concurrent requests with same token | Multiple parallel requests | Each sets context independently | `concurrentRequests_shouldBeThreadSafe` |

**GOTCHA NOTES:**
- ⚠️ **Header case sensitivity bug**: Code only checks lowercase "authorization", but standard HTTP headers are case-insensitive. Clients using "Authorization" (capitalized) will bypass authentication.
- ⚠️ **MDC leak risk**: If exception occurs before MDC.clear(), context may leak to other requests in thread pool.
- ⚠️ **FilterChain not called on exception**: When exception is caught, filter chain stops. This might be intended, but could cause issues with CORS or other filters.

---

### B. SubjectController Tests

| ID | Category | Scenario Description | Input | Expected Outcome | Test Method |
|----|----------|---------------------|-------|-----------------|-------------|
| SUB-T1 | Happy Path | Update subject settings with valid data | dailyLimit=50, newCardsPerDay=10, interval=1.5 | 200 OK, settings persisted | `updateSettings_withValidData_shouldSucceed` |
| SUB-T2 | Edge Case | Update with zero dailyLimit | dailyLimit=0 | 200 OK or 400 Bad Request? (ambiguous) | `updateSettings_withZeroDailyLimit_shouldHandle` |
| SUB-T3 | Edge Case | Update with negative dailyLimit | dailyLimit=-10 | Should reject (400) but no validation | `updateSettings_withNegativeDailyLimit_shouldReject` |
| SUB-T4 | Edge Case | Update with negative newCardsPerDay | newCardsPerDay=-5 | Should reject (400) but no validation | `updateSettings_withNegativeNewCards_shouldReject` |
| SUB-T5 | Edge Case | Update with zero interval | interval=0.0 | Likely invalid for spaced repetition | `updateSettings_withZeroInterval_shouldHandle` |
| SUB-T6 | Edge Case | Update with negative interval | interval=-1.5 | Should reject but no validation | `updateSettings_withNegativeInterval_shouldReject` |
| SUB-T7 | Edge Case | Update with extremely large values | dailyLimit=Integer.MAX_VALUE | Should handle or reject | `updateSettings_withMaxValues_shouldHandle` |
| SUB-T8 | Edge Case | Update with decimal overflow | interval=Double.MAX_VALUE | Should handle or reject | `updateSettings_withDecimalOverflow_shouldHandle` |
| SUB-T9 | Security | Unauthorized user tries to update | Wrong user auth token | 403 Forbidden or 404 Not Found | `updateSettings_withWrongUser_shouldForbid` |
| SUB-T10 | Security | Update settings for non-existent subject | Invalid subjectId UUID | 404 Not Found | `updateSettings_withInvalidSubject_shouldReturn404` |
| SUB-T11 | Security | Update settings for subject in different shelf | shelfId mismatch | 404 Not Found (ownership check) | `updateSettings_withWrongShelf_shouldReturn404` |
| SUB-T12 | Error Handling | Database connection failure | Simulate DB down | 500 or circuit breaker triggers | `updateSettings_withDbFailure_shouldReturnError` |
| SUB-T13 | Validation | Missing required fields (null check) | Request body with nulls | Should reject or handle defaults | `updateSettings_withNullFields_shouldHandle` |
| SUB-T14 | Path Variables | Invalid shelfId format | shelfId="not-a-uuid" | 400 Bad Request | `updateSettings_withInvalidShelfId_shouldReturn400` |
| SUB-T15 | Path Variables | Invalid subjectId format | subjectId="abc-123" | 400 Bad Request | `updateSettings_withInvalidSubjectId_shouldReturn400` |

**GOTCHA NOTES:**
- ⚠️ **No validation on SubjectSettingReq**: The record has no `@Min`, `@Max`, or `@NotNull` annotations. Negative or zero values can be persisted.
- ⚠️ **Variable name confusion**: Method parameter is `shelveId` but local variable is `shelfId`. Inconsistent naming.
- ⚠️ **No @CircuitBreaker annotation**: Unlike other methods, `updateSetting` doesn't have circuit breaker protection.
- ⚠️ **No @Transactional annotation**: Settings update might leave partial state on failure.

---

### C. SubjectServiceImpl Tests

| ID | Category | Scenario Description | Input | Expected Outcome | Test Method |
|----|----------|---------------------|-------|-----------------|-------------|
| SVC-T1 | Happy Path | Update settings successfully | Valid request + existing subject | Settings saved, success response | `updateSetting_withValidData_shouldSucceed` |
| SVC-T2 | Edge Case | Update settings with zero values | All fields = 0 | Persisted (no validation) | `updateSetting_withZeroValues_shouldPersist` |
| SVC-T3 | Edge Case | Update settings with negative values | All fields negative | Persisted (no validation) | `updateSetting_withNegativeValues_shouldPersist` |
| SVC-T4 | Error Handling | Subject not found | Non-existent subjectId | NotFoundException thrown | `updateSetting_subjectNotFound_shouldThrowException` |
| SVC-T5 | Error Handling | Shelf not found | Non-existent shelfId | NotFoundException thrown | `updateSetting_shelfNotFound_shouldThrowException` |
| SVC-T6 | Security | User doesn't own the shelf | Different user auth | NotFoundException (ownership check) | `updateSetting_wrongOwner_shouldThrowException` |
| SVC-T7 | Error Handling | Repository save fails | Simulate DB constraint violation | Exception propagated | `updateSetting_saveFails_shouldThrowException` |
| SVC-T8 | Edge Case | Update subject in wrong shelf | subjectId exists but belongs to different shelf | NotFoundException | `updateSetting_subjectInWrongShelf_shouldThrowException` |
| SVC-T9 | Validation | Null SubjectSettingReq | null request object | NullPointerException (no null check) | `updateSetting_nullRequest_shouldThrowNPE` |
| SVC-T10 | Refactoring | Verify Shelf entity usage | Renamed entity | Uses ShelfEntity, not ShelveEntity | `updateSetting_usesShelfEntity` |

**GOTCHA NOTES:**
- ⚠️ **No input validation**: Service layer doesn't validate numeric ranges. Negative dailyLimit=-100 will be saved.
- ⚠️ **Inconsistent return**: Method returns `ApiRes.success("Updated successfully")` without the updated entity data, unlike other methods.
- ⚠️ **No null check on request**: If request is null, NullPointerException will occur on `request.dailyLimit()`.

---

### D. Integration Tests (End-to-End)

| ID | Category | Scenario Description | Input | Expected Outcome | Test Method |
|----|----------|---------------------|-------|-----------------|-------------|
| INT-T1 | Happy Path | Create subject → Update settings → Retrieve | Full workflow | Settings persisted and retrievable | `fullSubjectLifecycle_shouldWork` |
| INT-T2 | Security | Authenticate → Create subject → Update settings | With real JWT | All operations succeed | `authenticatedWorkflow_shouldSucceed` |
| INT-T3 | Security | No authentication → Update settings | No JWT token | 401 Unauthorized | `unauthenticatedAccess_shouldReturn401` |
| INT-T4 | Security | User A creates, User B tries to update | Cross-user access | 403/404 error | `crossUserAccess_shouldBeForbidden` |
| INT-T5 | Database | Update settings and verify in DB | POST settings | Database record updated | `updateSettings_shouldPersistInDatabase` |
| INT-T6 | Database | Concurrent updates to same subject | Parallel PUT requests | Last write wins or optimistic locking | `concurrentUpdates_shouldHandleCorrectly` |
| INT-T7 | Error Handling | Update after subject deleted | Soft delete + update | 404 Not Found | `updateDeletedSubject_shouldReturn404` |
| INT-T8 | Cascade | Delete shelf → Verify subject settings | DELETE shelf, then GET subject | Subject no longer accessible | `deleteShelf_shouldCascadeToSubjects` |

**GOTCHA NOTES:**
- ⚠️ **No version control**: Concurrent updates might result in lost updates without optimistic locking.
- ⚠️ **Soft delete check**: Need to verify if `deleted=true` subjects are filtered properly.

---

## Assumptions & Ambiguities

### Clear Assumptions:
1. **dailyLimit**: Represents maximum cards to review per day
2. **newCardsPerDay**: Number of new cards introduced daily
3. **interval**: Multiplier for spaced repetition algorithm

### Ambiguities Requiring Clarification:
1. ❓ **Zero values**: Are `dailyLimit=0` or `newCardsPerDay=0` valid? (Means "unlimited" or "disabled"?)
2. ❓ **Negative values**: Should these be explicitly rejected with 400 error?
3. ❓ **Default values**: What happens if settings are never set? Are there system defaults?
4. ❓ **Maximum values**: Are there practical upper bounds? (e.g., dailyLimit > 1000?)
5. ❓ **Authorization header case**: Is the case-sensitivity change intentional or a bug?

---

## Coverage Requirements

### By Layer:
- **Controller Layer**: ≥ 90% (new endpoint + path variable changes)
- **Service Layer**: ≥ 90% (new method + refactored methods)
- **Filter Layer**: ≥ 90% (security-critical component)
- **Integration Layer**: ≥ 80% (end-to-end workflows)

### By Category:
- **Happy Path**: 100% (must pass)
- **Edge Cases**: ≥ 85%
- **Security**: 100% (authentication, authorization, injection)
- **Error Handling**: ≥ 90%

---

## Testing Approach

### Unit Tests:
- JUnit 5 + Mockito
- Mock all external dependencies (repositories, JWT utils, user service)
- Focus on business logic and edge cases

### Integration Tests:
- Spring Boot Test with @SpringBootTest
- TestContainers for PostgreSQL
- Real database interactions
- End-to-end request/response validation

### Test Naming Convention:
```
methodName_whenCondition_shouldExpectedOutcome
```

Examples:
- `updateSetting_withNegativeDailyLimit_shouldReject`
- `doFilterInternal_whenExpiredToken_shouldReturnUnauthorized`

---

## Next Steps

1. ✅ Test Strategy Defined (this document)
2. ⏭️ Implement Unit Tests for JwtAuthenticationFilter
3. ⏭️ Implement Unit Tests for SubjectController
4. ⏭️ Implement Unit Tests for SubjectService
5. ⏭️ Implement Integration Tests
6. ⏭️ Execute Tests and Document Findings
7. ⏭️ Create Security Summary
