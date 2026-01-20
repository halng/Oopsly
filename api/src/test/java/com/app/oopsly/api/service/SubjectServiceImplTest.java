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

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.ShelveRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.impl.SubjectServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectReq;
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
class SubjectServiceImplTest {

    @Mock private SubjectRepository subjectRepository;

    @Mock private ShelveRepository shelveRepository;

    @Mock private UserService userService;

    @InjectMocks private SubjectServiceImpl subjectService;

    private User currentUser;
    private ShelveEntity shelve;
    private SubjectEntity subject;
    private UUID shelveId;
    private UUID subjectId;
    private SubjectReq subjectReq;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
        subjectId = UUID.randomUUID();

        shelve = new ShelveEntity();
        shelve.setId(shelveId);
        shelve.setUser(currentUser);

        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setName("Test Subject");
        subject.setDescription("Test Description");
        subject.setShelve(shelve);

        subjectReq = new SubjectReq("Test Subject", "Test Description");
    }

    @Test
    void create_savesSubject() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        ApiRes result = subjectService.create(shelveId, subjectReq);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).save(any(SubjectEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.create(shelveId, subjectReq));
        verify(subjectRepository, never()).save(any(SubjectEntity.class));
    }

    @Test
    void update_updatesSubject() {
        SubjectReq updateReq = new SubjectReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        ApiRes result = subjectService.update(shelveId, subjectId, updateReq);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(subjectRepository, times(1)).save(any(SubjectEntity.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsEmpty() {
        SubjectReq invalidReq = new SubjectReq("", "Description");

        assertThrows(
                ValidationException.class,
                () -> subjectService.update(shelveId, subjectId, invalidReq));
        verify(subjectRepository, never()).save(any(SubjectEntity.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsNull() {
        SubjectReq invalidReq = new SubjectReq(null, "Description");

        assertThrows(
                ValidationException.class,
                () -> subjectService.update(shelveId, subjectId, invalidReq));
        verify(subjectRepository, never()).save(any(SubjectEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        SubjectReq updateReq = new SubjectReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> subjectService.update(shelveId, subjectId, updateReq));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void update_throwsNotFoundException_whenCollectionNotFound() {
        SubjectReq updateReq = new SubjectReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> subjectService.update(shelveId, subjectId, updateReq));
        verify(subjectRepository, never()).save(any(SubjectEntity.class));
    }

    @Test
    void delete_softDeletesCollectionAndCards() {
        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card = new CardEntity();
            card.setId(UUID.randomUUID());
            card.setDeleted(false);
            cards.add(card);
        }
        subject.setCards(cards);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(SubjectEntity.class))).thenReturn(subject);

        ApiRes result = subjectService.delete(shelveId, subjectId);

        assertNotNull(result);
        assertTrue(subject.getDeleted());
        for (CardEntity card : cards) {
            assertTrue(card.getDeleted());
        }
        verify(subjectRepository, times(1)).save(subject);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.delete(shelveId, subjectId));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.delete(shelveId, subjectId));
        verify(subjectRepository, never()).save(any(SubjectEntity.class));
    }

    @Test
    void getById_returnsSubject() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));

        ApiRes result = subjectService.getById(shelveId, subjectId);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getById(shelveId, subjectId));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getById(shelveId, subjectId));
    }

    @Test
    void getAllByShelve_withPagination_returnsSubjects() {
        List<SubjectEntity> collections = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            SubjectEntity col = new SubjectEntity();
            col.setId(UUID.randomUUID());
            col.setName("Subject " + i);
            col.setDescription("Description " + i);
            col.setShelve(shelve);
            collections.add(col);
        }

        Page<SubjectEntity> page = new PageImpl<>(collections, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findAllByShelve(eq(shelve), any(Pageable.class))).thenReturn(page);

        ApiRes result = subjectService.getAllByShelve(shelveId, 0, 10);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findAllByShelve(eq(shelve), any(Pageable.class));
    }

    @Test
    void getAllByShelve_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getAllByShelve(shelveId, 0, 10));
        verify(subjectRepository, never()).findAllByShelve(any(), any());
    }

    // Fallback Function Tests
    @Test
    void createFallback_throwsRuntimeException() {
        SubjectReq request = new SubjectReq("Test", "Description");
        RuntimeException cause = new RuntimeException("Service unavailable");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> subjectService.createFallback(shelveId, request, cause));

        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateFallback_throwsRuntimeException() {
        SubjectReq request = new SubjectReq("Updated", "New Description");
        RuntimeException cause = new RuntimeException("Database error");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> subjectService.updateFallback(shelveId, subjectId, request, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void deleteFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Network timeout");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> subjectService.deleteFallback(shelveId, subjectId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getByIdFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Circuit breaker open");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> subjectService.getByIdFallback(shelveId, subjectId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getAllByShelveFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Service degraded");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> subjectService.getAllByShelveFallback(shelveId, 0, 10, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void fallbackMethods_provideUserFriendlyMessages() {
        Throwable cause = new Throwable("Internal error");

        RetryLaterException createEx =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                subjectService.createFallback(
                                        shelveId, new SubjectReq("Test", "Desc"), cause));
        assertTrue(createEx.getMessage().contains("try again later"));
    }
}
