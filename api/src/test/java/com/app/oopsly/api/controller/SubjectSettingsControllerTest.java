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

package com.app.oopsly.api.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Controller layer tests for Subject Settings functionality (PR #60).
 * Tests the updateSetting endpoint which allows updating subject learning parameters.
 * 
 * QA Testing Goals:
 * - Verify controller properly delegates to service layer
 * - Test happy path scenarios
 * - Test edge cases with boundary values
 * - Expose missing validation in SubjectSettingReq
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Subject Settings Controller Tests (PR #60 QA)")
class SubjectSettingsControllerTest {

    @Mock private SubjectService subjectService;

    @InjectMocks private SubjectController subjectController;

    private UUID shelfId;
    private UUID subjectId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Updated successfully");
    }

    // ========== Happy Path Tests ==========

    @Test
    @DisplayName("T1: Update settings with valid positive values - Should succeed")
    void updateSetting_whenValidPositiveValues_shouldSucceed() {
        // Given: Valid settings request
        SubjectSettingReq validRequest = new SubjectSettingReq(30, 10, 2.0);
        when(subjectService.updateSetting(shelfId, subjectId, validRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, validRequest);

        // Then: Should delegate to service and return success
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, validRequest);
    }

    @Test
    @DisplayName("T2: Update settings with default values - Should succeed")
    void updateSetting_whenDefaultValues_shouldSucceed() {
        // Given: Default settings values
        SubjectSettingReq defaultRequest = new SubjectSettingReq(20, 5, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, defaultRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, defaultRequest);

        // Then: Should succeed
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, defaultRequest);
    }

    @Test
    @DisplayName("T3: Update settings with maximum reasonable values - Should succeed")
    void updateSetting_whenMaximumReasonableValues_shouldSucceed() {
        // Given: Large but reasonable values
        SubjectSettingReq largeRequest = new SubjectSettingReq(1000, 100, 10.0);
        when(subjectService.updateSetting(shelfId, subjectId, largeRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, largeRequest);

        // Then: Should succeed
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, largeRequest);
    }

    // ========== Edge Case Tests ==========

    @Test
    @DisplayName("T4: Update settings with zero dailyLimit - Should accept (exposes validation gap)")
    void updateSetting_whenDailyLimitZero_shouldAccept() {
        // GOTCHA: No validation prevents dailyLimit=0. Is 0 "unlimited" or invalid?
        // Expected: Should either validate and reject, or have clear documentation
        // Actual: Currently accepts any value without validation

        // Given: Zero dailyLimit
        SubjectSettingReq zeroLimitRequest = new SubjectSettingReq(0, 5, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, zeroLimitRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, zeroLimitRequest);

        // Then: Currently succeeds - potential issue if 0 is semantically invalid
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, zeroLimitRequest);
    }

    @Test
    @DisplayName("T5: Update settings with negative dailyLimit - Should accept (VALIDATION BUG)")
    void updateSetting_whenNegativeDailyLimit_shouldAccept() {
        // GOTCHA: SubjectSettingReq has NO @Min validation!
        // Expected: Should reject with 400 Bad Request
        // Actual: Controller accepts, service will save -10 to database

        // Given: Negative dailyLimit
        SubjectSettingReq negativeRequest = new SubjectSettingReq(-10, 5, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, negativeRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, negativeRequest);

        // Then: DEFECT - accepts negative value without validation
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, negativeRequest);
    }

    @Test
    @DisplayName("T6: Update settings with negative newCardsPerDay - Should accept (VALIDATION BUG)")
    void updateSetting_whenNegativeNewCardsPerDay_shouldAccept() {
        // GOTCHA: SubjectSettingReq has NO @Min validation!
        // Expected: Should reject with 400 Bad Request
        // Actual: Controller accepts invalid negative value

        // Given: Negative newCardsPerDay
        SubjectSettingReq negativeRequest = new SubjectSettingReq(20, -5, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, negativeRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, negativeRequest);

        // Then: DEFECT - accepts negative value
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, negativeRequest);
    }

    @Test
    @DisplayName("T7: Update settings with negative interval - Should accept (VALIDATION BUG)")
    void updateSetting_whenNegativeInterval_shouldAccept() {
        // GOTCHA: SubjectSettingReq has NO @DecimalMin validation!
        // Expected: Should reject with 400 Bad Request
        // Actual: Controller accepts invalid negative interval

        // Given: Negative interval
        SubjectSettingReq negativeRequest = new SubjectSettingReq(20, 5, -1.0);
        when(subjectService.updateSetting(shelfId, subjectId, negativeRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, negativeRequest);

        // Then: DEFECT - accepts negative value
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, negativeRequest);
    }

    @Test
    @DisplayName("T8: Update settings with zero interval - Should accept (potential issue)")
    void updateSetting_whenIntervalZero_shouldAccept() {
        // GOTCHA: interval=0.0 might cause division by zero or infinite loops
        // Expected: Should validate minimum positive value
        // Actual: Accepts zero

        // Given: Zero interval
        SubjectSettingReq zeroIntervalRequest = new SubjectSettingReq(20, 5, 0.0);
        when(subjectService.updateSetting(shelfId, subjectId, zeroIntervalRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, zeroIntervalRequest);

        // Then: Currently succeeds - may cause runtime issues later
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, zeroIntervalRequest);
    }

    @Test
    @DisplayName("T9: Update settings with Integer.MAX_VALUE - Should accept (overflow risk)")
    void updateSetting_whenMaxIntegerValues_shouldAccept() {
        // GOTCHA: Extremely large values accepted without upper bound validation
        // Expected: Should have reasonable @Max constraints
        // Actual: Accepts Integer.MAX_VALUE

        // Given: Maximum integer values
        SubjectSettingReq maxValueRequest =
                new SubjectSettingReq(Integer.MAX_VALUE, Integer.MAX_VALUE, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, maxValueRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, maxValueRequest);

        // Then: Accepts without validation - could cause issues in business logic
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, maxValueRequest);
    }

    @Test
    @DisplayName("T10: Update settings with high precision interval - Should succeed")
    void updateSetting_whenHighPrecisionInterval_shouldSucceed() {
        // Given: High precision decimal
        SubjectSettingReq precisionRequest = new SubjectSettingReq(20, 5, 0.000001);
        when(subjectService.updateSetting(shelfId, subjectId, precisionRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, precisionRequest);

        // Then: Should succeed
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, precisionRequest);
    }

    @Test
    @DisplayName(
            "T12: Update settings where dailyLimit < newCardsPerDay - Should accept (LOGIC BUG)")
    void updateSetting_whenDailyLimitLessThanNewCards_shouldAccept() {
        // GOTCHA: No cross-field validation!
        // Expected: Should reject - cannot add more new cards than daily limit allows
        // Actual: Accepts logically inconsistent values
        //
        // This is a BUSINESS LOGIC DEFECT. If dailyLimit=5 and newCardsPerDay=10,
        // how can you add 10 new cards when you're only allowed to review 5 total?

        // Given: dailyLimit (5) < newCardsPerDay (10)
        SubjectSettingReq invalidRequest = new SubjectSettingReq(5, 10, 1.0);
        when(subjectService.updateSetting(shelfId, subjectId, invalidRequest))
                .thenReturn(expectedResponse);

        // When: Calling updateSetting endpoint
        ApiRes result = subjectController.updateSetting(shelfId, subjectId, invalidRequest);

        // Then: DEFECT - accepts logically invalid combination
        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).updateSetting(shelfId, subjectId, invalidRequest);
    }

    // ========== Controller Delegation Tests ==========

    @Test
    @DisplayName("Verify controller properly delegates to service with correct parameters")
    void updateSetting_shouldDelegateToServiceWithCorrectParameters() {
        // Given: Specific UUIDs and request
        UUID specificShelfId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
        UUID specificSubjectId = UUID.fromString("123e4567-e89b-12d3-a456-426614174001");
        SubjectSettingReq request = new SubjectSettingReq(25, 8, 1.5);

        when(subjectService.updateSetting(specificShelfId, specificSubjectId, request))
                .thenReturn(expectedResponse);

        // When: Calling controller
        ApiRes result =
                subjectController.updateSetting(specificShelfId, specificSubjectId, request);

        // Then: Should pass exact same parameters to service
        assertSame(expectedResponse, result);
        verify(subjectService, times(1))
                .updateSetting(
                        eq(specificShelfId), eq(specificSubjectId), argThat(req ->
                                req.dailyLimit() == 25
                                        && req.newCardsPerDay() == 8
                                        && req.interval() == 1.5));
    }

    @Test
    @DisplayName("Verify no additional processing happens in controller layer")
    void updateSetting_shouldNotTransformData() {
        // Given: Request with specific values
        SubjectSettingReq originalRequest = new SubjectSettingReq(15, 3, 2.5);
        when(subjectService.updateSetting(any(UUID.class), any(UUID.class), any()))
                .thenReturn(expectedResponse);

        // When: Calling controller
        subjectController.updateSetting(shelfId, subjectId, originalRequest);

        // Then: Should pass request unchanged (verify by capturing argument)
        verify(subjectService).updateSetting(
                eq(shelfId),
                eq(subjectId),
                argThat(req ->
                        req.dailyLimit() == 15 && req.newCardsPerDay() == 3 && req.interval() == 2.5));
    }
}
