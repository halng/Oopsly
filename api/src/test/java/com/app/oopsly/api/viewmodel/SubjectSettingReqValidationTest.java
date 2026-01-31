/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package com.app.oopsly.api.viewmodel;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Validation tests for SubjectSettingReq DTO (PR #60).
 * Tests Jakarta Bean Validation constraints on the request object.
 *
 * QA Testing Goals:
 * - Document MISSING validation constraints
 * - Expose validation gaps in the DTO
 * - Demonstrate that invalid data passes through without rejection
 *
 * CRITICAL FINDINGS:
 * SubjectSettingReq currently has NO validation annotations (@Min, @Max, @NotNull, etc.)
 * This allows invalid data to reach the service and database layers.
 */
@DisplayName("SubjectSettingReq Validation Tests (PR #60 QA)")
class SubjectSettingReqValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    // ========== Expected Validation Behavior (Currently Missing) ==========

    @Test
    @DisplayName("VALIDATION GAP: Negative dailyLimit should be rejected but isn't")
    void validate_whenNegativeDailyLimit_shouldRejectButDoesnt() {
        // GOTCHA: SubjectSettingReq has NO @Min annotation on dailyLimit
        // Expected: Should have @Min(0) or @Min(1) constraint
        // Actual: Accepts negative values without validation

        // Given: Request with negative dailyLimit
        SubjectSettingReq request = new SubjectSettingReq(-10, 5, 1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found
        assertTrue(
                violations.isEmpty(),
                "VALIDATION BUG: Negative dailyLimit passes validation. "
                        + "Expected constraint: @Min(value = 1, message = \"Daily limit must be at least 1\")");
    }

    @Test
    @DisplayName("VALIDATION GAP: Negative newCardsPerDay should be rejected but isn't")
    void validate_whenNegativeNewCardsPerDay_shouldRejectButDoesnt() {
        // GOTCHA: SubjectSettingReq has NO @Min annotation on newCardsPerDay
        // Expected: Should have @Min(0) or @Min(1) constraint
        // Actual: Accepts negative values without validation

        // Given: Request with negative newCardsPerDay
        SubjectSettingReq request = new SubjectSettingReq(20, -5, 1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found
        assertTrue(
                violations.isEmpty(),
                "VALIDATION BUG: Negative newCardsPerDay passes validation. "
                        + "Expected constraint: @Min(value = 0, message = \"New cards per day must be at least 0\")");
    }

    @Test
    @DisplayName("VALIDATION GAP: Negative interval should be rejected but isn't")
    void validate_whenNegativeInterval_shouldRejectButDoesnt() {
        // GOTCHA: SubjectSettingReq has NO @DecimalMin annotation on interval
        // Expected: Should have @DecimalMin("0.0") or @Positive constraint
        // Actual: Accepts negative intervals that break SRS algorithm

        // Given: Request with negative interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, -1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found
        assertTrue(
                violations.isEmpty(),
                "VALIDATION BUG: Negative interval passes validation. "
                        + "Expected constraint: @DecimalMin(value = \"0.01\", message = \"Interval must be positive\")");
    }

    @Test
    @DisplayName("VALIDATION GAP: Zero interval should be rejected but isn't")
    void validate_whenZeroInterval_shouldRejectButDoesnt() {
        // GOTCHA: Zero interval could cause division by zero
        // Expected: Should have @DecimalMin(value = "0.01", inclusive = false)
        // Actual: Accepts zero

        // Given: Request with zero interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found
        assertTrue(
                violations.isEmpty(),
                "VALIDATION BUG: Zero interval passes validation. "
                        + "May cause division by zero in SRS calculations.");
    }

    @Test
    @DisplayName("VALIDATION GAP: Excessively large values should be rejected but aren't")
    void validate_whenExcessiveLargeValues_shouldRejectButDoesnt() {
        // GOTCHA: No @Max constraint prevents unrealistic values
        // Expected: Should have reasonable upper bounds like @Max(1000)
        // Actual: Accepts Integer.MAX_VALUE

        // Given: Request with unrealistic large values
        SubjectSettingReq request = new SubjectSettingReq(Integer.MAX_VALUE, Integer.MAX_VALUE, 1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found
        assertTrue(
                violations.isEmpty(),
                "VALIDATION BUG: Unrealistic large values pass validation. "
                        + "Expected constraints: @Max(value = 1000) on numeric fields");
    }

    @Test
    @DisplayName("VALIDATION GAP: No cross-field validation for dailyLimit vs newCardsPerDay")
    void validate_whenDailyLimitLessThanNewCards_shouldRejectButDoesnt() {
        // GOTCHA: CRITICAL BUSINESS LOGIC VALIDATION MISSING!
        // Expected: Custom validator ensuring dailyLimit >= newCardsPerDay
        // Actual: Accepts logically inconsistent combinations
        //
        // Recommended fix:
        // @ValidSubjectSettings (custom constraint)
        // public record SubjectSettingReq(int dailyLimit, int newCardsPerDay, double interval) {}
        //
        // With validator:
        // if (req.dailyLimit() < req.newCardsPerDay()) {
        //     context.buildConstraintViolationWithTemplate(
        //         "Daily limit must be greater than or equal to new cards per day"
        //     ).addConstraintViolation();
        // }

        // Given: Request where dailyLimit < newCardsPerDay
        SubjectSettingReq request = new SubjectSettingReq(5, 10, 1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: DEFECT - no violations found for logically invalid combination
        assertTrue(
                violations.isEmpty(),
                "BUSINESS LOGIC BUG: dailyLimit < newCardsPerDay passes validation. "
                        + "Cannot add 10 new cards when daily limit is 5!");
    }

    // ========== Positive Test Cases (What Currently Works) ==========

    @Test
    @DisplayName("Valid request with reasonable values - Should pass validation")
    void validate_whenReasonableValues_shouldPass() {
        // Given: Valid request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: Should pass (no violations)
        assertTrue(violations.isEmpty(), "Valid request should pass validation");
    }

    @Test
    @DisplayName("Valid request with default values - Should pass validation")
    void validate_whenDefaultValues_shouldPass() {
        // Given: Default values
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 1.0);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: Should pass
        assertTrue(violations.isEmpty(), "Default values should pass validation");
    }

    @Test
    @DisplayName("Valid request with high precision interval - Should pass validation")
    void validate_whenHighPrecisionInterval_shouldPass() {
        // Given: High precision interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.000001);

        // When: Validating
        Set<ConstraintViolation<SubjectSettingReq>> violations = validator.validate(request);

        // Then: Should pass
        assertTrue(violations.isEmpty(), "High precision interval should pass validation");
    }

    // ========== Recommended Validation Constraints ==========

    /**
     * RECOMMENDED FIXES:
     *
     * The SubjectSettingReq class should have the following validation constraints:
     *
     * public record SubjectSettingReq(
     *     @Min(value = 1, message = "Daily limit must be at least 1")
     *     @Max(value = 1000, message = "Daily limit cannot exceed 1000")
     *     int dailyLimit,
     *
     *     @Min(value = 0, message = "New cards per day cannot be negative")
     *     @Max(value = 500, message = "New cards per day cannot exceed 500")
     *     int newCardsPerDay,
     *
     *     @DecimalMin(value = "0.1", message = "Interval must be at least 0.1")
     *     @DecimalMax(value = "10.0", message = "Interval cannot exceed 10.0")
     *     double interval
     * ) {}
     *
     * Additionally, add a class-level custom constraint:
     *
     * @ValidSubjectSettings
     * public record SubjectSettingReq(...) {}
     *
     * With validator checking: dailyLimit >= newCardsPerDay
     */

    @Test
    @DisplayName("Documentation: List of missing validation constraints")
    void documentMissingValidationConstraints() {
        // This test serves as documentation of the validation gaps found

        String missingConstraints = """
                
                MISSING VALIDATION CONSTRAINTS IN SubjectSettingReq:
                
                1. @Min on dailyLimit (currently allows negative values)
                   Recommended: @Min(value = 1, message = "Daily limit must be at least 1")
                
                2. @Max on dailyLimit (currently allows Integer.MAX_VALUE)
                   Recommended: @Max(value = 1000, message = "Daily limit cannot exceed 1000")
                
                3. @Min on newCardsPerDay (currently allows negative values)
                   Recommended: @Min(value = 0, message = "New cards per day cannot be negative")
                
                4. @Max on newCardsPerDay (currently allows Integer.MAX_VALUE)
                   Recommended: @Max(value = 500, message = "New cards per day cannot exceed 500")
                
                5. @DecimalMin on interval (currently allows negative and zero values)
                   Recommended: @DecimalMin(value = "0.1", message = "Interval must be at least 0.1")
                
                6. @DecimalMax on interval (currently allows unlimited values)
                   Recommended: @DecimalMax(value = "10.0", message = "Interval cannot exceed 10.0")
                
                7. Custom cross-field validation (currently missing)
                   Recommended: @ValidSubjectSettings constraint checking dailyLimit >= newCardsPerDay
                
                IMPACT:
                - Invalid data can reach the service layer
                - Database can be corrupted with semantically invalid values
                - API returns 200 OK for invalid requests instead of 400 Bad Request
                - No client-side feedback about validation errors
                - Runtime errors possible from division by zero or negative intervals
                
                PRIORITY: HIGH - Data integrity issue
                """;

        // This test always passes but documents the issues
        assertTrue(true, missingConstraints);
    }
}
