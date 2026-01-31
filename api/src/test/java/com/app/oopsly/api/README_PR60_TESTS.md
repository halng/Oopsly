# QA Automation Tests for PR #60

## Overview

This directory contains comprehensive automated tests for Pull Request #60, which introduces:
- JWT Authentication Filter enhancements
- Subject settings endpoint
- Entity refactoring (Shelve → Shelf)

## ⚠️ Important Note

**These tests are designed to validate the changes in PR #60 and will only compile/run once that PR is merged or you are on the `oops-56` branch.**

The tests reference classes and methods that are introduced in PR #60:
- `ShelfEntity` (renamed from `ShelveEntity`)
- `SubjectSettingReq` (new DTO)
- `SubjectService.updateSetting()` (new method)
- Modified `JwtAuthenticationFilter` with MDC and error handling

## Test Files Created

### 1. JwtAuthenticationFilterPR60Test.java
**Location:** `api/src/test/java/com/app/oopsly/api/config/JwtAuthenticationFilterPR60Test.java`

**Coverage:** 25+ test cases including:
- MDC context management with X-Request-ID
- Lowercase "authorization" header handling (BUG EXPOSED)
- Exception handling and error responses
- MDC cleanup verification
- Security edge cases (expired tokens, invalid signatures, SQL injection)
- Extreme value tests

**Key Bugs Identified:**
- 🔴 **CRITICAL**: Filter only checks lowercase "authorization" header, violating HTTP specification
- 🔴 **CRITICAL**: FilterChain not called when exception occurs (affects CORS)

### 2. SubjectControllerPR60Test.java
**Location:** `api/src/test/java/com/app/oopsly/api/controller/SubjectControllerPR60Test.java`

**Coverage:** 35+ test cases including:
- Happy path tests for new `/settings` endpoint
- Edge cases with zero and negative values
- Extreme value tests (Integer.MAX_VALUE, Double.NaN, Double.POSITIVE_INFINITY)
- Path variable validation
- Request body validation
- Content-Type and HTTP method tests

**Key Bugs Identified:**
- 🔴 **CRITICAL**: SubjectSettingReq has NO validation annotations
- 🔴 **CRITICAL**: Negative values accepted and persisted
- 🟡 **MEDIUM**: NaN and Infinity can be persisted for interval field

### 3. SubjectServiceImplPR60Test.java
**Location:** `api/src/test/java/com/app/oopsly/api/service/SubjectServiceImplPR60Test.java`

**Coverage:** 35+ test cases including:
- Happy path tests for `updateSetting` method
- Zero and negative value handling
- Error handling (subject not found, shelf not found, wrong owner)
- Null handling tests
- Extreme value tests
- Refactoring verification (ShelfEntity vs ShelveEntity)

**Key Bugs Identified:**
- 🔴 **CRITICAL**: No input validation at service layer
- 🔴 **CRITICAL**: Null request parameter causes NullPointerException
- 🟡 **MEDIUM**: Missing @CircuitBreaker annotation
- 🟡 **MEDIUM**: Missing @Transactional annotation

## Running the Tests

### Prerequisites
```bash
# Switch to the PR branch or merge PR #60
git checkout oops-56
# OR wait for PR #60 to be merged into main
```

### Compile Tests
```bash
cd api
./gradlew compileTestJava
```

### Run All PR #60 Tests
```bash
./gradlew test --tests "*PR60Test"
```

### Run Individual Test Classes
```bash
# JWT Filter Tests
./gradlew test --tests "JwtAuthenticationFilterPR60Test"

# Controller Tests
./gradlew test --tests "SubjectControllerPR60Test"

# Service Tests
./gradlew test --tests "SubjectServiceImplPR60Test"
```

### Run with Coverage
```bash
./gradlew test jacocoTestReport --tests "*PR60Test"
# View report at: build/reports/jacoco/test/html/index.html
```

## Test Strategy

See [TEST_STRATEGY_PR60.md](../../test/TEST_STRATEGY_PR60.md) for detailed test coverage tables, risk analysis, and testing approach.

## Critical Security Findings

### 1. HTTP Header Case-Sensitivity Bug (CRITICAL)
**Location:** JwtAuthenticationFilter.java line 52

**Issue:** The filter checks for lowercase `"authorization"` header only:
```java
final String authHeader = request.getHeader("authorization");
```

**Impact:** According to RFC 7230, HTTP header names are case-insensitive. Standard HTTP clients use `"Authorization"` (capitalized), which will bypass authentication entirely.

**Test Coverage:** JWT-T3, JWT-T4, JWT-T4b in JwtAuthenticationFilterPR60Test

**Recommendation:** Use case-insensitive header lookup or revert to "Authorization"

### 2. Missing Input Validation (CRITICAL)
**Location:** SubjectSettingReq.java

**Issue:** No validation annotations on the record:
```java
public record SubjectSettingReq(int dailyLimit, int newCardsPerDay, double interval) {}
```

**Impact:** 
- Negative values can be persisted (dailyLimit=-100)
- Zero values accepted (unclear if valid business logic)
- NaN and Infinity can be stored in interval field

**Test Coverage:** SUB-T3, SUB-T4, SUB-T6 in SubjectControllerPR60Test
**Test Coverage:** SVC-T2, SVC-T3 in SubjectServiceImplPR60Test

**Recommendation:** Add validation:
```java
public record SubjectSettingReq(
    @Min(1) int dailyLimit,
    @Min(1) int newCardsPerDay,
    @Min(0) @Finite double interval
) {}
```

### 3. Missing Safety Annotations (MEDIUM)
**Location:** SubjectServiceImpl.updateSetting()

**Issues:**
- No `@CircuitBreaker` annotation (unlike other methods)
- No `@Transactional` annotation (risk of partial updates)
- No null check on request parameter

**Test Coverage:** SVC-T9 in SubjectServiceImplPR60Test

**Recommendation:**
```java
@Override
@Transactional
@CircuitBreaker(name = "subjectServiceCircuitBreaker", fallbackMethod = "updateSettingFallback")
public ApiRes updateSetting(UUID shelveId, UUID subjectId, SubjectSettingReq request) {
    Objects.requireNonNull(request, "SubjectSettingReq cannot be null");
    // ... rest of method
}
```

## Test Results Summary

**Total Tests Created:** 95+
- JwtAuthenticationFilterPR60Test: 25 tests
- SubjectControllerPR60Test: 35 tests
- SubjectServiceImplPR60Test: 35 tests

**Critical Bugs Found:** 5
**Medium Severity Issues:** 3

**Expected Test Results:**
- All tests should PASS when run against PR #60 code
- Several tests EXPOSE bugs that need fixing (documented with GOTCHA comments)
- Tests marked with "BUG" in names/comments intentionally pass to demonstrate the bug exists

## Next Steps

1. ✅ Merge or checkout PR #60 branch
2. ✅ Run all tests to verify they compile and pass
3. ⏭️ Review failed tests and fix bugs in production code
4. ⏭️ Re-run tests after fixes
5. ⏭️ Add integration tests if needed
6. ⏭️ Update production code with validation annotations
7. ⏭️ Create security summary document

## Contact

For questions about these tests, refer to:
- Test Strategy: [TEST_STRATEGY_PR60.md](../../test/TEST_STRATEGY_PR60.md)
- Original Issue: https://github.com/halng/Oopsly/issues/[issue-number]
- Pull Request: https://github.com/halng/Oopsly/pull/60
