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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Comprehensive tests for SubjectServiceImpl changes in PR #60.
 *
 * <p>This test suite focuses on the new updateSetting method introduced in PR #60:
 * - SubjectSettingReq handling
 * - Input validation (or lack thereof)
 * - Entity relationship changes (Shelve → Shelf)
 * - Error handling and exception scenarios
 *
 * <p>GOTCHA NOTES:
 * - No input validation on SubjectSettingReq values (negative, zero, NaN)
 * - Method returns ApiRes without updated entity data
 * - No null check on request parameter
 * - Missing @CircuitBreaker annotation (unlike other methods)
 * - Missing @Transactional annotation
 * - Variable naming inconsistency (shelveId param, shelfId local var)
 */
@ExtendWith(MockitoExtension.class)
class SubjectServiceImplPR60Test {

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
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        
        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();

        shelf = new ShelfEntity();
        shelf.setId(shelfId);
        shelf.setUser(currentUser);

        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setName("Test Subject");
        subject.setDescription("Test Description");
        subject.setShelf(shelf);
        subject.setDailyLimit(100);
        subject.setNewCardsPerDay(20);
        subject.setInterval(2.0);
    }

    // ============================================================================
    // HAPPY PATH TESTS
    // ============================================================================

    @Test
    @DisplayName("SVC-T1: Update settings with valid data should succeed")
    void updateSetting_withValidData_shouldSucceed() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertNotNull(result);
        assertEquals("Updated successfully", result.getMessage());
        verify(subjectRepository, times(1)).save(subject);
        assertEquals(50, subject.getDailyLimit());
        assertEquals(10, subject.getNewCardsPerDay());
        assertEquals(1.5, subject.getInterval());
    }

    @Test
    @DisplayName("Update settings should call repository save method")
    void updateSetting_shouldCallRepositorySave() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(75, 15, 2.0);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        verify(subjectRepository).save(subject);
    }

    // ============================================================================
    // EDGE CASE TESTS - ZERO VALUES
    // ============================================================================

    @Test
    @DisplayName("SVC-T2: Update settings with zero values should persist (no validation)")
    void updateSetting_withZeroValues_shouldPersist() {
        /*
         * GOTCHA: No validation exists at service layer. Zero values will be
         * persisted to database, which might break business logic for
         * spaced repetition algorithm.
         */
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(0, 0, 0.0);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertNotNull(result);
        verify(subjectRepository).save(subject);
        assertEquals(0, subject.getDailyLimit());
        assertEquals(0, subject.getNewCardsPerDay());
        assertEquals(0.0, subject.getInterval());
    }

    // ============================================================================
    // EDGE CASE TESTS - NEGATIVE VALUES (BUG)
    // ============================================================================

    @Test
    @DisplayName("SVC-T3: Update settings with negative values should persist (BUG)")
    void updateSetting_withNegativeValues_shouldPersist() {
        /*
         * GOTCHA: This test EXPOSES A CRITICAL BUG. Negative values make no
         * sense for dailyLimit, newCardsPerDay, or interval, but they are
         * accepted and persisted without validation.
         */
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(-100, -50, -2.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        ApiRes result = subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertNotNull(result);
        verify(subjectRepository).save(subject);
        assertEquals(-100, subject.getDailyLimit(), "Negative dailyLimit accepted - BUG");
        assertEquals(-50, subject.getNewCardsPerDay(), "Negative newCardsPerDay accepted - BUG");
        assertEquals(-2.5, subject.getInterval(), "Negative interval accepted - BUG");
    }

    @Test
    @DisplayName("Update with negative dailyLimit only should persist")
    void updateSetting_withNegativeDailyLimit_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(-10, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(-10, subject.getDailyLimit());
    }

    @Test
    @DisplayName("Update with negative newCardsPerDay only should persist")
    void updateSetting_withNegativeNewCardsPerDay_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, -5, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(-5, subject.getNewCardsPerDay());
    }

    @Test
    @DisplayName("Update with negative interval only should persist")
    void updateSetting_withNegativeInterval_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, -1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(-1.5, subject.getInterval());
    }

    // ============================================================================
    // ERROR HANDLING TESTS
    // ============================================================================

    @Test
    @DisplayName("SVC-T4: Subject not found should throw NotFoundException")
    void updateSetting_subjectNotFound_shouldThrowException() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.empty());

        // Act & Assert
        NotFoundException exception = assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request));

        assertTrue(exception.getMessage().contains("Subject not found"));
        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("SVC-T5: Shelf not found should throw NotFoundException")
    void updateSetting_shelfNotFound_shouldThrowException() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.empty());

        // Act & Assert
        NotFoundException exception = assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request));

        assertTrue(exception.getMessage().contains("Shelf not found"));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("SVC-T6: Different user trying to update should throw NotFoundException")
    void updateSetting_wrongOwner_shouldThrowException() {
        // Arrange
        User differentUser = new User();
        differentUser.setEmail("hacker@example.com");
        
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(differentUser);
        when(shelfRepository.findByIdAndUser(shelfId, differentUser))
                .thenReturn(Optional.empty()); // Shelf doesn't belong to this user

        // Act & Assert
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request));

        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("SVC-T7: Repository save failure should propagate exception")
    void updateSetting_saveFails_shouldThrowException() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class)))
                .thenThrow(new RuntimeException("Database constraint violation"));

        // Act & Assert
        assertThrows(
                RuntimeException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request));
    }

    @Test
    @DisplayName("SVC-T8: Subject in wrong shelf should throw NotFoundException")
    void updateSetting_subjectInWrongShelf_shouldThrowException() {
        // Arrange
        ShelfEntity differentShelf = new ShelfEntity();
        differentShelf.setId(UUID.randomUUID());
        differentShelf.setUser(currentUser);
        
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.empty()); // Subject doesn't belong to this shelf

        // Act & Assert
        assertThrows(
                NotFoundException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, request));
    }

    // ============================================================================
    // NULL HANDLING TESTS
    // ============================================================================

    @Test
    @DisplayName("SVC-T9: Null request should throw NullPointerException (no null check)")
    void updateSetting_nullRequest_shouldThrowNPE() {
        /*
         * GOTCHA: No null check on request parameter. If request is null,
         * the code will throw NullPointerException when calling request.dailyLimit().
         */
        // Arrange
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));

        // Act & Assert
        assertThrows(
                NullPointerException.class,
                () -> subjectService.updateSetting(shelfId, subjectId, null));

        verify(subjectRepository, never()).save(any());
    }

    @Test
    @DisplayName("Null shelfId should throw exception")
    void updateSetting_nullShelfId_shouldThrowException() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);

        // Act & Assert
        assertThrows(
                Exception.class,
                () -> subjectService.updateSetting(null, subjectId, request));
    }

    @Test
    @DisplayName("Null subjectId should throw exception")
    void updateSetting_nullSubjectId_shouldThrowException() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));

        // Act & Assert
        assertThrows(
                Exception.class,
                () -> subjectService.updateSetting(shelfId, null, request));
    }

    // ============================================================================
    // EXTREME VALUE TESTS
    // ============================================================================

    @Test
    @DisplayName("Update with Integer.MAX_VALUE should persist")
    void updateSetting_withMaxIntValues_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(
                Integer.MAX_VALUE, Integer.MAX_VALUE, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(Integer.MAX_VALUE, subject.getDailyLimit());
        assertEquals(Integer.MAX_VALUE, subject.getNewCardsPerDay());
    }

    @Test
    @DisplayName("Update with Integer.MIN_VALUE should persist")
    void updateSetting_withMinIntValues_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(
                Integer.MIN_VALUE, Integer.MIN_VALUE, -1000.0);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(Integer.MIN_VALUE, subject.getDailyLimit());
        assertEquals(Integer.MIN_VALUE, subject.getNewCardsPerDay());
    }

    @Test
    @DisplayName("Update with Double.MAX_VALUE interval should persist")
    void updateSetting_withMaxDoubleInterval_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.MAX_VALUE);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertEquals(Double.MAX_VALUE, subject.getInterval());
    }

    @Test
    @DisplayName("Update with NaN interval should persist")
    void updateSetting_withNaNInterval_shouldPersist() {
        /*
         * GOTCHA: NaN (Not a Number) can be persisted, which will break
         * any mathematical calculations using this interval.
         */
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.NaN);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertTrue(Double.isNaN(subject.getInterval()), "NaN value accepted - will break calculations");
    }

    @Test
    @DisplayName("Update with POSITIVE_INFINITY interval should persist")
    void updateSetting_withInfinityInterval_shouldPersist() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.POSITIVE_INFINITY);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        assertTrue(Double.isInfinite(subject.getInterval()));
    }

    // ============================================================================
    // REFACTORING VERIFICATION TESTS
    // ============================================================================

    @Test
    @DisplayName("SVC-T10: Verify method uses ShelfEntity (not ShelveEntity)")
    void updateSetting_usesShelfEntity() {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser))
                .thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        // Act
        subjectService.updateSetting(shelfId, subjectId, request);

        // Assert
        verify(shelfRepository).findByIdAndUser(shelfId, currentUser);
        verify(subjectRepository).findByIdAndShelve(subjectId, shelf);
        
        // Verify we're working with ShelfEntity class
        assertInstanceOf(ShelfEntity.class, shelf);
    }
}
