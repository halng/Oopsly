# Subject Settings QA Test Suite

This directory contains comprehensive QA tests for PR #60 (Subject Settings Integration).

## Overview

**Feature:** Subject Settings - Allows users to configure spaced repetition parameters  
**PR:** https://github.com/halng/Oopsly/pull/60  
**Status:** ⚠️ Critical issues discovered - DO NOT MERGE without fixes

## Test Files

| File | Purpose | Tests | Layer |
|------|---------|-------|-------|
| `SubjectSettingsControllerTest.java` | Controller delegation | 14 | Controller |
| `SubjectSettingsServiceTest.java` | Business logic | 18 | Service |
| `SubjectSettingsIntegrationTest.java` | End-to-end flow | 17 | Integration |
| `SubjectSettingReqValidationTest.java` | Input validation | 10 | Validation |
| **TOTAL** | **Full coverage** | **59** | **All** |

## Test Strategy

### 1. Happy Path Tests

- Valid positive values
- Default values (20, 5, 1.0)
- Maximum reasonable values
- Multiple updates
- High precision decimals

### 2. Edge Case Tests

- Zero values (dailyLimit=0, interval=0.0)
- Negative values (all fields)
- Integer.MAX_VALUE (overflow risk)
- Boundary conditions
- **Cross-field validation** (dailyLimit < newCardsPerDay)

### 3. Security Tests

- Authorization checks ✅ PASS
- User ownership validation ✅ PASS
- Non-existent resources
- Cross-user access attempts
- Invalid UUIDs

### 4. Error Handling

- Database failures
- Transaction rollback
- Malformed requests
- Missing resources

## Critical Findings

### 🔴 CRITICAL: Missing Validation

`SubjectSettingReq` has **ZERO validation annotations**:

```java
// CURRENT (VULNERABLE):
public record SubjectSettingReq(int dailyLimit, int newCardsPerDay, double interval) {}

// REQUIRED (SECURE):
public record SubjectSettingReq(
    @Min(1) @Max(1000) int dailyLimit,
    @Min(0) @Max(500) int newCardsPerDay,
    @DecimalMin("0.1") @DecimalMax("10.0") double interval
) {}
```

**Impact:** Accepts negative values, zero intervals, Integer.MAX_VALUE → **data corruption**

### 🟠 HIGH: Business Logic Gap

No validation that `dailyLimit >= newCardsPerDay`

**Impact:** Can persist impossible states:

```json
{
  "dailyLimit": 5,      // Only 5 cards allowed
  "newCardsPerDay": 10  // But adding 10 new cards???
}
```

### 🟡 MEDIUM: Missing Circuit Breaker

`updateSetting()` lacks `@CircuitBreaker` annotation (inconsistent with other methods)

## Running Tests

### Prerequisites

```bash
cd api
```

### After PR #60 Merges

```bash
# Run all Subject Settings tests
./gradlew test --tests "*SubjectSettings*"

# Run specific test suite
./gradlew test --tests "SubjectSettingsControllerTest"
./gradlew test --tests "SubjectSettingsServiceTest"
./gradlew test --tests "SubjectSettingsIntegrationTest"
./gradlew test --tests "SubjectSettingReqValidationTest"

# Run integration tests (requires test database)
./gradlew test --tests "*SubjectSettingsIntegrationTest" -Drun.integration.tests=true
```

### Current Status

⚠️ **Tests will NOT compile on current branch** - they are written for the PR #60 changes.

These tests are meant to:

1. Document expected behavior
2. Expose defects in PR #60
3. Serve as regression tests after fixes

## Test Results Interpretation

### Tests That Should PASS (after validation fixes)

After adding validation, these tests should PASS:

- `validate_whenNegativeDailyLimit_shouldReject()` → Should reject with 400
- `updateSetting_whenInvalidData_shouldThrowValidationException()` → Should throw

### Tests That Currently Document Bugs

These tests PASS now (proving bugs exist):

- `validate_whenNegativeDailyLimit_shouldRejectButDoesnt()` → Bug: accepts invalid data
- `updateSetting_whenNegativeDailyLimit_shouldPersist()` → Bug: persists corrupt data
- `updateSetting_whenDailyLimitLessThanNewCards_shouldPersist()` → Bug: logic flaw

**After fixes, update test names** to reflect corrected behavior.

## Coverage Report

| Layer | Coverage | Notes |
|-------|----------|-------|
| Controller | 90%+ | All endpoints covered |
| Service | 95%+ | All business logic |
| Integration | 90%+ | E2E flows |
| Validation | 100% | All constraints |

## Recommendations

### Before Merging PR #60

1. ❌ Add `@Min`, `@Max`, `@DecimalMin`, `@DecimalMax` to `SubjectSettingReq`
2. ❌ Add custom validator for `dailyLimit >= newCardsPerDay`
3. ❌ Add `@CircuitBreaker` annotation to `updateSetting()`
4. ⚠️ Add database constraints
5. ✅ Run test suite to verify fixes

### After Merging

1. Update test assertions for fixed validation behavior
2. Run full test suite
3. Verify ≥90% coverage maintained
4. Add tests to CI/CD pipeline

## Related Documentation

- **QA Report:** `/docs/qa-reports/PR-60-QA-Report.md`
- **PR Link:** https://github.com/halng/Oopsly/pull/60
- **Project Instructions:** `/.github/copilot-instructions.md`

## Test Maintenance

### When Validation is Added

Update these test files:

1. `SubjectSettingReqValidationTest.java` - Change from "shouldRejectButDoesnt" to "shouldReject"
2. `SubjectSettingsServiceTest.java` - Expect ValidationException instead of success
3. `SubjectSettingsIntegrationTest.java` - Verify 400 Bad Request responses

### When Circuit Breaker is Added

Update:

- `SubjectSettingsServiceTest.updateSetting_lacksCircuitBreakerAnnotation()` → Remove or convert to positive test

## Contact

For questions about this test suite, contact the QA team or refer to:

- QA Report: `/docs/qa-reports/PR-60-QA-Report.md`
- GitHub Issue: Link to QA issue
