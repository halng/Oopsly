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

package com.app.oopsly.api.integration;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.UserRepository;
import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for Subject Settings functionality (PR #60).
 * Tests end-to-end flow from service layer to database persistence.
 *
 * QA Testing Goals:
 * - Verify complete request-to-database flow
 * - Test database constraints and data integrity
 * - Validate authorization across security context
 * - Expose issues with invalid data persistence
 *
 * Run with: -Drun.integration.tests=true
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
@EnabledIfSystemProperty(named = "run.integration.tests", matches = "true")
@DisplayName("Subject Settings Integration Tests (PR #60 QA)")
class SubjectSettingsIntegrationTest {

    @Autowired private SubjectService subjectService;

    @Autowired private ShelfRepository shelfRepository;

    @Autowired private SubjectRepository subjectRepository;

    @Autowired private UserRepository userRepository;

    private User testUser;
    private User otherUser;
    private ShelfEntity testShelf;
    private SubjectEntity testSubject;

    @BeforeEach
    void setUp() {
        // Create and save test user
        testUser = new User();
        testUser.setEmail("test-settings@example.com");
        testUser.setName("Test User");
        testUser.setPassword("hashedPassword");
        testUser = userRepository.save(testUser);

        // Create another user for authorization tests
        otherUser = new User();
        otherUser.setEmail("other-user@example.com");
        otherUser.setName("Other User");
        otherUser.setPassword("hashedPassword");
        otherUser = userRepository.save(otherUser);

        // Set security context with test user
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(testUser, null, null));

        // Create and save test shelf
        testShelf = new ShelfEntity();
        testShelf.setName("Test Shelf");
        testShelf.setDescription("Test Shelf Description");
        testShelf.setUser(testUser);
        testShelf = shelfRepository.save(testShelf);

        // Create and save test subject with default settings
        testSubject = SubjectEntity.builder()
                .name("Test Subject")
                .description("Test Subject Description")
                .shelf(testShelf)
                .dailyLimit(20)
                .newCardsPerDay(5)
                .interval(1.0)
                .build();
        testSubject = subjectRepository.save(testSubject);
    }

    // ========== Happy Path Integration Tests ==========

    @Test
    @DisplayName("T1: Update settings end-to-end - Should persist to database")
    void updateSetting_endToEnd_shouldPersistToDatabase() {
        // Given: Valid settings request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        // When: Updating settings through service
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Should succeed
        assertTrue(result.success());
        assertEquals("Updated successfully", result.message());

        // And: Changes should be persisted in database
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(30, updatedSubject.get().getDailyLimit());
        assertEquals(10, updatedSubject.get().getNewCardsPerDay());
        assertEquals(2.0, updatedSubject.get().getInterval());
    }

    @Test
    @DisplayName("T2: Update settings multiple times - Should persist latest values")
    void updateSetting_multipleTimes_shouldPersistLatestValues() {
        // Given: Multiple update requests
        SubjectSettingReq firstRequest = new SubjectSettingReq(25, 8, 1.5);
        SubjectSettingReq secondRequest = new SubjectSettingReq(35, 12, 2.5);

        // When: Updating settings twice
        subjectService.updateSetting(testShelf.getId(), testSubject.getId(), firstRequest);
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), secondRequest);

        // Then: Should persist latest values
        assertTrue(result.success());
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(35, updatedSubject.get().getDailyLimit());
        assertEquals(12, updatedSubject.get().getNewCardsPerDay());
        assertEquals(2.5, updatedSubject.get().getInterval());
    }

    @Test
    @DisplayName("T3: Update settings - Should not affect other subject properties")
    void updateSetting_shouldNotAffectOtherProperties() {
        // Given: Original subject properties
        String originalName = testSubject.getName();
        String originalDescription = testSubject.getDescription();
        UUID originalShelfId = testSubject.getShelf().getId();
        SubjectSettingReq request = new SubjectSettingReq(40, 15, 3.0);

        // When: Updating only settings
        subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Other properties should remain unchanged
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(originalName, updatedSubject.get().getName());
        assertEquals(originalDescription, updatedSubject.get().getDescription());
        assertEquals(originalShelfId, updatedSubject.get().getShelf().getId());
    }

    // ========== Security & Authorization Integration Tests ==========

    @Test
    @DisplayName("T13: Attempt to update settings for another user's subject - Should fail")
    void updateSetting_whenSubjectBelongsToOtherUser_shouldThrowNotFoundException() {
        // Given: Another user's shelf and subject
        ShelfEntity otherShelf = new ShelfEntity();
        otherShelf.setName("Other User's Shelf");
        otherShelf.setUser(otherUser);
        otherShelf = shelfRepository.save(otherShelf);

        SubjectEntity otherSubject = SubjectEntity.builder()
                .name("Other User's Subject")
                .shelf(otherShelf)
                .dailyLimit(20)
                .newCardsPerDay(5)
                .interval(1.0)
                .build();
        otherSubject = subjectRepository.save(otherSubject);

        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        // When/Then: Should throw NotFoundException (not 403 to avoid leaking info)
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(otherShelf.getId(), otherSubject.getId(), request),
                "Should not allow updating another user's subject");

        // And: Original values should remain unchanged
        Optional<SubjectEntity> unchangedSubject = subjectRepository.findById(otherSubject.getId());
        assertTrue(unchangedSubject.isPresent());
        assertEquals(20, unchangedSubject.get().getDailyLimit());
        assertEquals(5, unchangedSubject.get().getNewCardsPerDay());
    }

    @Test
    @DisplayName("T17: Attempt to update non-existent subject - Should fail")
    void updateSetting_whenSubjectDoesNotExist_shouldThrowNotFoundException() {
        // Given: Non-existent subject ID
        UUID nonExistentId = UUID.randomUUID();
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        // When/Then: Should throw NotFoundException
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(testShelf.getId(), nonExistentId, request),
                "Should fail when subject does not exist");
    }

    @Test
    @DisplayName("T18: Verify authorization check uses authenticated user")
    void updateSetting_shouldUseAuthenticatedUser() {
        // Given: Settings request
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        // When: Updating with authenticated user
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Should succeed for authenticated user
        assertTrue(result.success());

        // When: Switch to other user
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(otherUser, null, null));

        // Then: Should fail to access same subject
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request),
                "Other user should not be able to update");
    }

    // ========== Edge Cases & Data Integrity Tests ==========

    @Test
    @DisplayName("T4: Update with zero dailyLimit - Persists to database (validation gap)")
    void updateSetting_whenDailyLimitZero_shouldPersistToDatabase() {
        // GOTCHA: No validation prevents zero value
        // Given: Zero dailyLimit
        SubjectSettingReq request = new SubjectSettingReq(0, 5, 1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Currently persists zero without validation
        assertTrue(result.success());
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(0, updatedSubject.get().getDailyLimit());
    }

    @Test
    @DisplayName("T5: Update with negative dailyLimit - Persists to database (DATA CORRUPTION BUG)")
    void updateSetting_whenNegativeDailyLimit_shouldPersistToDatabase() {
        // GOTCHA: CRITICAL DATA INTEGRITY BUG!
        // Expected: Should reject with validation error
        // Actual: Persists invalid negative value to database

        // Given: Negative dailyLimit
        SubjectSettingReq request = new SubjectSettingReq(-10, 5, 1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: DEFECT - persists invalid data
        assertTrue(result.success());

        // And: DATABASE CONTAINS INVALID DATA
        Optional<SubjectEntity> corruptedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(corruptedSubject.isPresent());
        assertEquals(-10, corruptedSubject.get().getDailyLimit());
        assertTrue(
                corruptedSubject.get().getDailyLimit() < 0,
                "Database now contains semantically invalid negative daily limit");
    }

    @Test
    @DisplayName("T6: Update with negative newCardsPerDay - Persists to database (DATA CORRUPTION BUG)")
    void updateSetting_whenNegativeNewCardsPerDay_shouldPersistToDatabase() {
        // GOTCHA: CRITICAL DATA INTEGRITY BUG!
        // Given: Negative newCardsPerDay
        SubjectSettingReq request = new SubjectSettingReq(20, -5, 1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: DEFECT - persists invalid data
        assertTrue(result.success());
        Optional<SubjectEntity> corruptedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(corruptedSubject.isPresent());
        assertEquals(-5, corruptedSubject.get().getNewCardsPerDay());
    }

    @Test
    @DisplayName("T7: Update with negative interval - Persists to database (DATA CORRUPTION BUG)")
    void updateSetting_whenNegativeInterval_shouldPersistToDatabase() {
        // GOTCHA: Negative interval breaks spaced repetition algorithm
        // Given: Negative interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, -1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: DEFECT - persists invalid interval
        assertTrue(result.success());
        Optional<SubjectEntity> corruptedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(corruptedSubject.isPresent());
        assertEquals(-1.0, corruptedSubject.get().getInterval());
    }

    @Test
    @DisplayName("T8: Update with zero interval - Persists to database (potential runtime bug)")
    void updateSetting_whenIntervalZero_shouldPersistToDatabase() {
        // GOTCHA: Zero interval could cause division by zero
        // Given: Zero interval
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Persists potentially problematic value
        assertTrue(result.success());
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(0.0, updatedSubject.get().getInterval());
    }

    @Test
    @DisplayName("T9: Update with Integer.MAX_VALUE - Persists to database (unrealistic values)")
    void updateSetting_whenMaxIntegerValue_shouldPersistToDatabase() {
        // GOTCHA: No upper bound validation
        // Given: Maximum integer values
        SubjectSettingReq request = new SubjectSettingReq(Integer.MAX_VALUE, Integer.MAX_VALUE, 1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Persists unrealistic values
        assertTrue(result.success());
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(Integer.MAX_VALUE, updatedSubject.get().getDailyLimit());
        assertEquals(Integer.MAX_VALUE, updatedSubject.get().getNewCardsPerDay());
    }

    @Test
    @DisplayName("T10: Update with high precision interval - Should maintain precision")
    void updateSetting_whenHighPrecisionInterval_shouldMaintainPrecision() {
        // Given: High precision decimal
        SubjectSettingReq request = new SubjectSettingReq(20, 5, 0.000001);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: Should maintain precision
        assertTrue(result.success());
        Optional<SubjectEntity> updatedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(updatedSubject.isPresent());
        assertEquals(0.000001, updatedSubject.get().getInterval(), 0.0000001);
    }

    @Test
    @DisplayName("T12: Update where dailyLimit < newCardsPerDay - Persists invalid state (LOGIC BUG)")
    void updateSetting_whenDailyLimitLessThanNewCards_shouldPersistToDatabase() {
        // GOTCHA: CRITICAL BUSINESS LOGIC BUG!
        // This combination makes no sense: can't add 10 new cards if daily limit is 5
        // Expected: Should reject with validation error
        // Actual: Persists logically invalid configuration

        // Given: dailyLimit (5) < newCardsPerDay (10)
        SubjectSettingReq request = new SubjectSettingReq(5, 10, 1.0);

        // When: Updating settings
        ApiRes result = subjectService.updateSetting(testShelf.getId(), testSubject.getId(), request);

        // Then: DEFECT - persists logically invalid state
        assertTrue(result.success());

        // And: DATABASE NOW CONTAINS LOGICALLY INCONSISTENT DATA
        Optional<SubjectEntity> invalidSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(invalidSubject.isPresent());
        assertEquals(5, invalidSubject.get().getDailyLimit());
        assertEquals(10, invalidSubject.get().getNewCardsPerDay());

        // Verify the logical inconsistency is persisted
        assertTrue(
                invalidSubject.get().getDailyLimit() < invalidSubject.get().getNewCardsPerDay(),
                "Database contains logically invalid state: "
                        + "newCardsPerDay exceeds dailyLimit");
    }

    @Test
    @DisplayName("Verify database transaction rollback on error")
    void updateSetting_whenErrorOccurs_shouldRollbackTransaction() {
        // Given: Original values
        Integer originalDailyLimit = testSubject.getDailyLimit();
        Integer originalNewCards = testSubject.getNewCardsPerDay();
        Double originalInterval = testSubject.getInterval();

        // When: Attempting to update non-existent subject (causes error)
        UUID nonExistentId = UUID.randomUUID();
        SubjectSettingReq request = new SubjectSettingReq(30, 10, 2.0);

        try {
            subjectService.updateSetting(testShelf.getId(), nonExistentId, request);
            fail("Should have thrown NotFoundException");
        } catch (NotFoundException e) {
            // Expected
        }

        // Then: Original subject should remain unchanged
        Optional<SubjectEntity> unchangedSubject = subjectRepository.findById(testSubject.getId());
        assertTrue(unchangedSubject.isPresent());
        assertEquals(originalDailyLimit, unchangedSubject.get().getDailyLimit());
        assertEquals(originalNewCards, unchangedSubject.get().getNewCardsPerDay());
        assertEquals(originalInterval, unchangedSubject.get().getInterval());
    }
}
