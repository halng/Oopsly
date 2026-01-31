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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.impl.SubjectServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Service layer tests for Subject Settings functionality (PR #60).
 * Tests the business logic for updating subject learning parameters.
 *
 * QA Testing Goals:
 * - Verify authorization checks (user can only update own subjects)
 * - Test data persistence with various value combinations
 * - Expose missing business validations
 * - Test error scenarios and exception handling
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Subject Settings Service Tests (PR #60 QA)")
class SubjectSettingsServiceTest {

    @Mock private SubjectRepository subjectRepository;

    @Mock private ShelfRepository shelfRepository;

    @Mock private UserService userService;

    @InjectMocks private SubjectServiceImpl subjectService;

    private User currentUser;
    private ShelfEntity shelf;
    private SubjectEntity subject;
    private UUID shelfId;
    private UUID subjectId;

    @BeforeEach
    void setUp() {
        currentUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .password("hashedPassword")
                .name("Test User")
                .build();

        shelfId = UUID.randomUUID();
        shelf = ShelfEntity.builder()
                .id(shelfId)
                .name("Test Shelf")
                .user(currentUser)
                .build();

        subjectId = UUID.randomUUID();
        subject = SubjectEntity.builder()
                .id(subjectId)
                .name("Test Subject")
                .description("Test Description")
                .shelf(shelf)
                .dailyLimit(20)
                .newCardsPerDay(5)
                .interval(1.0)
                .build();

        when(userService.getCurrentUser()).thenReturn(currentUser);
    }

    // ========== Happy Path Tests ==========

    @Test
    @DisplayName("T1: Update settings with valid values - Should persist correctly")
    void updateSetting_whenValidValues_shouldPersistCorrectly() {
        // Given: Valid settings request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should update all three fields
        assertEquals(30, subject.getDailyLimit());
        assertEquals(10, subject.getNewCardsPerDay());
        assertEquals(2.0, subject.getInterval());
        assertTrue(result.success());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T2: Update settings - Should preserve other subject properties")
    void updateSetting_whenUpdatingSettings_shouldPreserveOtherProperties() {
        // Given: Existing subject with name and description
        SubjectSettingReq request = new SubjectSettingReq(25, 8, 1.5);
        String originalName = subject.getName();
        String originalDescription = subject.getDescription();

        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Name and description should remain unchanged
        assertEquals(originalName, subject.getName());
        assertEquals(originalDescription, subject.getDescription());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T3: Update settings with maximum values - Should accept")
    void updateSetting_whenMaximumValues_shouldAccept() {
        // Given: Maximum reasonable values
        SubjectSettingReq request = new SubjectSettingReq(1000, 100, 10.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should accept large values
        assertTrue(result.success());
        assertEquals(1000, subject.getDailyLimit());
        assertEquals(100, subject.getNewCardsPerDay());
    }

    // ========== Security & Authorization Tests ==========

    @Test
    @DisplayName("T13: Update settings for subject in another user's shelf - Should throw NotFoundException")
    void updateSetting_whenShelfBelongsToAnotherUser_shouldThrowNotFoundException() {
        // GOTCHA: This tests the authorization mechanism.
        // Expected: 404 Not Found (not 403, to avoid leaking shelf existence)
        // Actual: Should throw NotFoundException

        // Given: Shelf not found for current user
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.empty());

        // When/Then: Should throw NotFoundException
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request),
                "Should throw NotFoundException when shelf not found for user");

        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("T17: Update settings for non-existent subject - Should throw NotFoundException")
    void updateSetting_whenSubjectDoesNotExist_shouldThrowNotFoundException() {
        // Given: Subject not found
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.empty());

        // When/Then: Should throw NotFoundException
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request),
                "Should throw NotFoundException when subject not found");

        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("T18: Verify authorization check uses current user from context")
    void updateSetting_shouldUseCurrentUserFromSecurityContext() {
        // Given: Settings request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should query shelf with current user
        verify(userService).getCurrentUser();
        verify(shelfRepository).findByIdAndUser(shelfId, currentUser);
    }

    // ========== Edge Case Tests ==========

    @Test
    @DisplayName("T4: Update settings with zero dailyLimit - Should persist (no validation)")
    void updateSetting_whenDailyLimitZero_shouldPersist() {
        // GOTCHA: No validation prevents dailyLimit=0
        // Expected: Should validate and reject OR document as "unlimited"
        // Actual: Accepts and persists 0

        // Given: Zero dailyLimit
        SubjectSettingReq request = new SubjectSettingReq(0, 5, 1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Currently persists 0 without validation
        assertTrue(result.success());
        assertEquals(0, subject.getDailyLimit());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T5: Update settings with negative dailyLimit - Should persist (VALIDATION BUG)")
    void updateSetting_whenNegativeDailyLimit_shouldPersist() {
        // GOTCHA: Service layer has NO validation for negative values!
        // Expected: Should throw ValidationException
        // Actual: Persists invalid negative value to database

        // Given: Negative dailyLimit
        SubjectSettingReq request = new SubjectSettingReq(-10, 5, 1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: DEFECT - persists invalid negative value
        assertTrue(result.success());
        assertEquals(-10, subject.getDailyLimit());

        // Verify data corruption saved to database
        ArgumentCaptor<SubjectEntity> captor = ArgumentCaptor.forClass(SubjectEntity.class);
        verify(subjectRepository).save(captor.capture());
        assertEquals(-10, captor.getValue().getDailyLimit());
    }

    @Test
    @DisplayName("T6: Update settings with negative newCardsPerDay - Should persist (VALIDATION BUG)")
    void updateSetting_whenNegativeNewCardsPerDay_shouldPersist() {
        // GOTCHA: Service layer has NO validation for negative values!
        // Expected: Should throw ValidationException
        // Actual: Persists invalid negative value to database

        // Given: Negative newCardsPerDay
        SubjectSettingReq request = new SubjectSettingReq(20, -5, 1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: DEFECT - persists invalid negative value
        assertTrue(result.success());
        assertEquals(-5, subject.getNewCardsPerDay());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T7: Update settings with negative interval - Should persist (VALIDATION BUG)")
    void updateSetting_whenNegativeInterval_shouldPersist() {
        // GOTCHA: Service layer has NO validation for negative intervals!
        // Expected: Should throw ValidationException
        // Actual: Persists invalid negative interval that could break SRS algorithm

        // Given: Negative interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, -1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: DEFECT - persists invalid negative interval
        assertTrue(result.success());
        assertEquals(-1.0, subject.getInterval());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T8: Update settings with zero interval - Should persist (potential runtime bug)")
    void updateSetting_whenIntervalZero_shouldPersist() {
        // GOTCHA: interval=0.0 could cause division by zero in SRS calculations
        // Expected: Should validate minimum positive value
        // Actual: Persists 0.0, may cause runtime errors later

        // Given: Zero interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Currently persists 0.0 - potential runtime bug
        assertTrue(result.success());
        assertEquals(0.0, subject.getInterval());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T9: Update settings with Integer.MAX_VALUE - Should persist (overflow risk)")
    void updateSetting_whenMaxIntegerValue_shouldPersist() {
        // GOTCHA: No upper bound validation
        // Expected: Should have reasonable @Max constraints
        // Actual: Accepts Integer.MAX_VALUE which is semantically meaningless

        // Given: Maximum integer value
        SubjectSettingReq request = new SubjectSettingReq(Integer.MAX_VALUE, Integer.MAX_VALUE, 1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Persists unrealistic value
        assertTrue(result.success());
        assertEquals(Integer.MAX_VALUE, subject.getDailyLimit());
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T10: Update settings with high precision interval - Should persist correctly")
    void updateSetting_whenHighPrecisionInterval_shouldPersist() {
        // Given: High precision decimal
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.000001);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should store with precision
        assertTrue(result.success());
        assertEquals(0.000001, subject.getInterval(), 0.0000001);
        verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("T12: Update settings where dailyLimit < newCardsPerDay - Should persist (LOGIC BUG)")
    void updateSetting_whenDailyLimitLessThanNewCards_shouldPersist() {
        // GOTCHA: CRITICAL BUSINESS LOGIC DEFECT!
        // Expected: Should reject - cannot add 10 new cards when daily limit is 5
        // Actual: Persists logically invalid configuration
        //
        // This will cause runtime issues when the system tries to add more new cards
        // than the daily limit allows. Should have cross-field validation like:
        // if (dailyLimit < newCardsPerDay) throw new ValidationException(...)

        // Given: dailyLimit (5) < newCardsPerDay (10)
        SubjectSettingReq request = new SubjectSettingReq(5, 10, 1.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: DEFECT - persists logically invalid combination
        assertTrue(result.success());
        assertEquals(5, subject.getDailyLimit());
        assertEquals(10, subject.getNewCardsPerDay());
        assertTrue(
                subject.getDailyLimit() < subject.getNewCardsPerDay(),
                "Logic bug: daily limit should be >= new cards per day");

        verify(subjectRepository).save(subject);
    }

    // ========== Repository Interaction Tests ==========

    @Test
    @DisplayName("Verify correct repository method calls in expected order")
    void updateSetting_shouldCallRepositoriesInCorrectOrder() {
        // Given: Valid request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should call repositories in correct order
        var inOrder = inOrder(userService, shelfRepository, subjectRepository);
        inOrder.verify(userService).getCurrentUser();
        inOrder.verify(shelfRepository).findByIdAndUser(shelfId, currentUser);
        inOrder.verify(subjectRepository).findByIdAndShelve(subjectId, shelf);
        inOrder.verify(subjectRepository).save(subject);
    }

    @Test
    @DisplayName("Verify only modified subject is saved")
    void updateSetting_shouldOnlySaveModifiedSubject() {
        // Given: Valid request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings
        subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Should save exactly once
        verify(subjectRepository, times(1)).save(subject);
        verify(shelfRepository, never()).save(any());
    }

    // ========== Missing Circuit Breaker Test ==========

    @Test
    @DisplayName("INCONSISTENCY: updateSetting lacks @CircuitBreaker annotation")
    void updateSetting_lacksCircuitBreakerAnnotation() {
        // GOTCHA: All other SubjectService methods have @CircuitBreaker annotation
        // but updateSetting does NOT. This is inconsistent and could cause issues
        // during service outages.
        //
        // Expected: Should have @CircuitBreaker with fallback method
        // Actual: Direct call without circuit breaker protection
        //
        // This test documents the inconsistency but cannot directly test the annotation.
        // Manual code review required to confirm and fix.

        // Given: Valid request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // When: Updating settings (without circuit breaker protection)
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Then: Works but lacks resilience pattern
        assertTrue(result.success());
        // NOTE: If repository throws exception, it will propagate directly
        // instead of triggering fallback behavior like other methods
    }
}
