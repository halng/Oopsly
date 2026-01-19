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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.ShelveRepository;
import com.app.oopsly.api.service.impl.ShelveServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.ShelveReq;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
class ShelveServiceImplTest {

    @Mock private ShelveRepository shelveRepository;

    @Mock private UserService userService;

    @InjectMocks private ShelveServiceImpl shelveService;

    private ShelveReq shelveReq;
    private User currentUser;
    private UUID shelveId;

    @BeforeEach
    void setUp() {
        shelveReq =
                new ShelveReq(
                        "Sample Shelve",
                        "A shelve for testing purposes with sufficient description length to meet"
                                + " validation");
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
    }

    @Test
    void create_savesNewShelve() {
        ShelveEntity savedShelve = new ShelveEntity();
        savedShelve.setId(shelveId);
        savedShelve.setName(shelveReq.name());
        savedShelve.setDescription(shelveReq.description());
        savedShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(savedShelve);

        ApiRes result = shelveService.create(shelveReq);

        assertNotNull(result);
        verify(shelveRepository, times(1)).save(any(ShelveEntity.class));
    }

    @Test
    void update_updatesExistingShelve() {
        ShelveEntity existingShelve = new ShelveEntity();
        existingShelve.setId(shelveId);
        existingShelve.setName("Old Name");
        existingShelve.setDescription("Old Description with sufficient length");
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.update(shelveReq, shelveId);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(shelveRepository, times(1)).save(any(ShelveEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.update(shelveReq, shelveId));
        verify(shelveRepository, never()).save(any(ShelveEntity.class));
    }

    @Test
    void delete_softDeletesShelve() {
        ShelveEntity existingShelve = new ShelveEntity();
        existingShelve.setId(shelveId);
        existingShelve.setDeleted(false);
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.delete(shelveId);

        assertNotNull(result);
        assertTrue(existingShelve.getDeleted());
        verify(shelveRepository, times(1)).save(existingShelve);
    }

    @Test
    void delete_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.delete(shelveId));
    }

    @Test
    void getById_returnsShelve() {
        ShelveEntity existingShelve = new ShelveEntity();
        existingShelve.setId(shelveId);
        existingShelve.setUser(currentUser);
        existingShelve.setName(shelveReq.name());
        existingShelve.setDescription(shelveReq.description());

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));

        ApiRes result = shelveService.getById(shelveId);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
    }

    @Test
    void getById_throwsNotFoundException_whenShelveNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> shelveService.getById(shelveId));
    }

    @Test
    void create_withMultipleShelves_createsAll() {
        ShelveEntity savedShelve = new ShelveEntity();
        savedShelve.setId(UUID.randomUUID());
        savedShelve.setName(shelveReq.name());
        savedShelve.setDescription(shelveReq.description());
        savedShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(savedShelve);

        // Create multiple shelves
        ApiRes result1 = shelveService.create(shelveReq);
        ApiRes result2 = shelveService.create(shelveReq);

        assertNotNull(result1);
        assertNotNull(result2);
        verify(shelveRepository, times(2)).save(any(ShelveEntity.class));
    }

    @Test
    void update_withSameData_stillSaves() {
        ShelveEntity existingShelve = new ShelveEntity();
        existingShelve.setId(shelveId);
        existingShelve.setName(shelveReq.name());
        existingShelve.setDescription(shelveReq.description());
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.update(shelveReq, shelveId);

        assertNotNull(result);
        verify(shelveRepository, times(1)).save(any(ShelveEntity.class));
    }

    @Test
    void delete_alreadyDeleted_stillMarksAsDeleted() {
        ShelveEntity existingShelve = new ShelveEntity();
        existingShelve.setId(shelveId);
        existingShelve.setDeleted(true); // Already deleted
        existingShelve.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(existingShelve));
        when(shelveRepository.save(any(ShelveEntity.class))).thenReturn(existingShelve);

        ApiRes result = shelveService.delete(shelveId);

        assertNotNull(result);
        assertTrue(existingShelve.getDeleted());
        verify(shelveRepository, times(1)).save(existingShelve);
    }

    @Test
    void getAll_withPagination_delegatesToService() {
        List<ShelveEntity> shelves = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            ShelveEntity shelve = new ShelveEntity();
            shelve.setId(UUID.randomUUID());
            shelve.setName("Shelve " + i);
            shelve.setDescription(
                    "Description " + i + " with sufficient length for validation requirements");
            shelves.add(shelve);
        }

        Page<ShelveEntity> page = new PageImpl<>(shelves, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(page);

        ApiRes result = shelveService.getAll(0, 10);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findAllByUser(eq(currentUser), any(Pageable.class));
    }

    // Fallback Function Tests
    @Test
    void createFallback_throwsRuntimeException() {
        ShelveReq request = new ShelveReq("Test Shelve", "Test Description");
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
        ShelveReq request = new ShelveReq("Updated Shelve", "Updated Description");
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
                        RetryLaterException.class, () -> shelveService.deleteFallback(shelveId, cause));

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
                        RetryLaterException.class, () -> shelveService.getAllFallback(0, 10, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void fallbackMethods_withNullCause_handleGracefully() {
        RetryLaterException createEx =
                assertThrows(
                        RetryLaterException.class,
                        () -> shelveService.createFallback(new ShelveReq("Test", "Desc"), null));

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
                        () -> shelveService.createFallback(new ShelveReq("Test", "Desc"), cause));
        RetryLaterException updateEx =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                shelveService.updateFallback(
                                        new ShelveReq("Test", "Desc"), shelveId, cause));
        RetryLaterException deleteEx =
                assertThrows(
                        RetryLaterException.class, () -> shelveService.deleteFallback(shelveId, cause));

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
                                        new ShelveReq("Test", "Desc"), wrappedException));

        assertEquals(wrappedException, exception.getCause());
        assertEquals(originalException, exception.getCause().getCause());
    }
}
