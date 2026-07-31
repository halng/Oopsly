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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.TestSuiteEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.service.impl.ShelfServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.ShelfReq;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.apache.commons.lang3.tuple.Pair;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ShelfServiceImplTest {

    @Mock private ShelfRepository shelfRepository;

    @Mock private SubjectRepository subjectRepository;

    @Mock private CardRepository cardRepository;

    @Mock private TestSuiteRepository testSuiteRepository;

    @Mock private UserService userService;

    @Mock private CardService cardService;

    @InjectMocks private ShelfServiceImpl shelveService;

    private ShelfReq shelfReq;
    private User currentUser;
    private UUID shelveId;

    @BeforeEach
    void setUp() {
        shelfReq =
                new ShelfReq(
                        "code",
                        "Sample Shelve",
                        "A shelve for testing purposes with sufficient description length to meet"
                                + " validation");
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
    }

    @Test
    void create_savesNewShelve() {
        ShelfEntity savedShelve = new ShelfEntity();
        savedShelve.setId(shelveId);
        savedShelve.setName(shelfReq.name());
        savedShelve.setDescription(shelfReq.description());
        savedShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(savedShelve);

        ApiRes result = shelveService.create(shelfReq);

        assertNotNull(result);
        verify(shelfRepository, times(1)).save(any(ShelfEntity.class));
    }

    @Test
    void update_updatesExistingShelve() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setName("Old Name");
        existingShelve.setDescription("Old Description with sufficient length");
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.update(shelfReq, shelveId);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(shelfRepository, times(1)).save(any(ShelfEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.update(shelfReq, shelveId));
        verify(shelfRepository, never()).save(any(ShelfEntity.class));
    }

    @Test
    void delete_softDeletesShelve() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setDeleted(false);
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));

        // Mock cascade delete operations
        Page<SubjectEntity> emptyPage = new PageImpl<>(Collections.emptyList());
        when(subjectRepository.findAllByShelve(eq(existingShelve), any(Pageable.class)))
                .thenReturn(emptyPage);
        when(testSuiteRepository.findAllByShelve(existingShelve))
                .thenReturn(Collections.emptyList());

        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.delete(shelveId);

        assertNotNull(result);
        assertTrue(existingShelve.getDeleted());
        verify(shelfRepository, times(1)).save(existingShelve);
    }

    @Test
    void delete_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.delete(shelveId));
    }

    @Test
    void getById_returnsShelve() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setUser(currentUser);
        existingShelve.setName(shelfReq.name());
        existingShelve.setDescription(shelfReq.description());

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));

        ApiRes result = shelveService.getById(shelveId);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
    }

    @Test
    void getById_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.getById(shelveId));
    }

    @Test
    void create_withMultipleShelves_createsAll() {
        ShelfEntity savedShelve = new ShelfEntity();
        savedShelve.setId(UUID.randomUUID());
        savedShelve.setName(shelfReq.name());
        savedShelve.setDescription(shelfReq.description());
        savedShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(savedShelve);

        // Create multiple shelves
        ApiRes result1 = shelveService.create(shelfReq);
        ApiRes result2 = shelveService.create(shelfReq);

        assertNotNull(result1);
        assertNotNull(result2);
        verify(shelfRepository, times(2)).save(any(ShelfEntity.class));
    }

    @Test
    void update_withSameData_stillSaves() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setName(shelfReq.name());
        existingShelve.setDescription(shelfReq.description());
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.update(shelfReq, shelveId);

        assertNotNull(result);
        verify(shelfRepository, times(1)).save(any(ShelfEntity.class));
    }

    @Test
    void delete_alreadyDeleted_stillMarksAsDeleted() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setDeleted(true); // Already deleted
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));

        // Mock cascade delete operations
        Page<SubjectEntity> emptyPage = new PageImpl<>(Collections.emptyList());
        when(subjectRepository.findAllByShelve(eq(existingShelve), any(Pageable.class)))
                .thenReturn(emptyPage);
        when(testSuiteRepository.findAllByShelve(existingShelve))
                .thenReturn(Collections.emptyList());

        when(shelfRepository.save(any(ShelfEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.delete(shelveId);

        assertNotNull(result);
        assertTrue(existingShelve.getDeleted());
        verify(shelfRepository, times(1)).save(existingShelve);
    }

    @Test
    void getAll_withPagination_delegatesToService() {
        List<ShelfEntity> shelves = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            ShelfEntity shelve = new ShelfEntity();
            shelve.setId(UUID.randomUUID());
            shelve.setName("Shelve " + i);
            shelve.setDescription(
                    "Description " + i + " with sufficient length for validation requirements");
            shelves.add(shelve);
        }

        Page<ShelfEntity> page = new PageImpl<>(shelves, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(page);

        ApiRes result = shelveService.getAll(0, 10);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findAllByUser(eq(currentUser), any(Pageable.class));
    }

    // Fallback Function Tests
    @Test
    void createFallback_throwsRuntimeException() {
        ShelfReq request = new ShelfReq("test", "Test Shelve", "Test Description");
        RuntimeException cause = new RuntimeException("Service unavailable");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.createFallback(request, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateFallback_throwsRuntimeException() {
        ShelfReq request = new ShelfReq("test", "Updated Shelve", "Updated Description");
        RuntimeException cause = new RuntimeException("Database connection failed");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.updateFallback(request, shelveId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void deleteFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Circuit breaker open");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.deleteFallback(shelveId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getByIdFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Service degraded");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.getByIdFallback(shelveId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getAllFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Network timeout");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.getAllFallback(0, 10, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void fallbackMethods_withNullCause_handleGracefully() {
        RetryLaterException createEx =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                shelveService.createFallback(
                                        new ShelfReq("code", "Test", "Desc"), null));

        assertNotNull(createEx);
        assertTrue(createEx.getMessage().contains("currently unavailable"));
        assertNull(createEx.getCause());
    }

    @Test
    void fallbackMethods_provideUserFriendlyMessages() {
        Throwable cause = new Throwable("Internal error");

        RetryLaterException createEx =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                shelveService.createFallback(
                                        new ShelfReq("icon", "Test", "Desc"), cause));
        RetryLaterException updateEx =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                shelveService.updateFallback(
                                        new ShelfReq("icon", "Test", "Desc"), shelveId, cause));
        RetryLaterException deleteEx =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.deleteFallback(shelveId, cause));

        assertTrue(createEx.getMessage().contains("try again later"));
        assertTrue(updateEx.getMessage().contains("try again later"));
        assertTrue(deleteEx.getMessage().contains("try again later"));
    }

    @Test
    void fallbackMethods_preserveExceptionChain() {
        Exception originalException = new java.sql.SQLException("Connection timeout");
        RuntimeException wrappedException =
                new RuntimeException("Database error", originalException);

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                shelveService.createFallback(
                                        new ShelfReq("icon", "Test", "Desc"), wrappedException));

        assertEquals(wrappedException, exception.getCause());
        assertEquals(originalException, exception.getCause().getCause());
    }

    @Test
    void delete_cascadesSubjectsCardsAndTestSuites() {
        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setDeleted(false);
        existingShelve.setUser(currentUser);

        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        CardEntity card = new CardEntity();
        card.setId(UUID.randomUUID());
        card.setDeleted(false);
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(UUID.randomUUID());
        suite.setDeleted(false);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(subjectRepository.findAllByShelve(eq(existingShelve), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(subject)));
        when(cardRepository.findAllBySubject(eq(subject), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(card)));
        when(testSuiteRepository.findAllByShelve(existingShelve)).thenReturn(List.of(suite));
        when(shelfRepository.save(existingShelve)).thenReturn(existingShelve);

        ApiRes result = shelveService.delete(shelveId);

        assertTrue(result.getBody().isSuccess());
        assertTrue(Boolean.TRUE.equals(card.getDeleted()));
        assertTrue(Boolean.TRUE.equals(subject.getDeleted()));
        assertTrue(Boolean.TRUE.equals(suite.getDeleted()));
        verify(cardRepository).saveAll(anyList());
        verify(testSuiteRepository).saveAll(anyList());
    }

    @Test
    void getById_withSubjects_mapsPracticeStats() {
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        subject.setName("Math");
        subject.setDescription("desc");
        subject.setDailyLimit(20);
        subject.setNewCardsPerDay(10);
        subject.setInterval(1.0);

        ShelfEntity existingShelve = new ShelfEntity();
        existingShelve.setId(shelveId);
        existingShelve.setUser(currentUser);
        existingShelve.setName(shelfReq.name());
        existingShelve.setDescription(shelfReq.description());
        existingShelve.setIcon(shelfReq.icon());
        existingShelve.setSubjects(List.of(subject));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(cardService.getShortPracticeStats(subject)).thenReturn(Pair.of(3, 70.0));

        ApiRes result = shelveService.getById(shelveId);

        assertTrue(result.getBody().isSuccess());
        verify(cardService).getShortPracticeStats(subject);
    }
}
