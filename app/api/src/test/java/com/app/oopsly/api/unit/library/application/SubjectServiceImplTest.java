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

package com.app.oopsly.api.unit.library.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.application.vm.PagingRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectCount;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.subject.SubjectServiceImpl;
import com.app.oopsly.api.subject.vm.SubjectReq;
import com.app.oopsly.api.subject.vm.SubjectRes;
import com.app.oopsly.api.subject.vm.SubjectSettingReq;
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

    @Mock private ShelfRepository shelfRepository;

    @Mock private CurrentUser currentUser;

    @Mock private CardRepository cardRepository;

    @InjectMocks private SubjectServiceImpl subjectService;

    private UUID currentUserId;
    private Shelf shelve;
    private Subject subject;
    private UUID shelveId;
    private UUID subjectId;
    private SubjectReq subjectReq;

    @BeforeEach
    void setUp() {
        currentUserId = UUID.randomUUID();
        shelveId = UUID.randomUUID();
        subjectId = UUID.randomUUID();

        shelve = new Shelf();
        shelve.setId(shelveId);
        shelve.setUserId(currentUserId);

        subject = new Subject();
        subject.setId(subjectId);
        subject.setName("Test Subject");
        subject.setDescription("Test Description");
        subject.setShelf(shelve);

        subjectReq =
                new SubjectReq(
                        "Test Subject",
                        "Test Description",
                        "tag1,tag2",
                        "#FFFFF",
                        true,
                        "test-subject");
    }

    @Test
    void create_savesSubject() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.save(any(Subject.class))).thenReturn(subject);

        ApiRes result = subjectService.create(shelveId, subjectReq);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUserId(shelveId, currentUserId);
        verify(subjectRepository, times(1)).save(any(Subject.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.create(shelveId, subjectReq));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void update_updatesSubject() {
        SubjectReq updateReq =
                new SubjectReq(
                        "Updated Name",
                        "Updated Description",
                        "tag1,tag2",
                        "#000000",
                        false,
                        "updated-subject");

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(Subject.class))).thenReturn(subject);
        ApiRes result = subjectService.update(shelveId, subjectId, updateReq);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUserId(shelveId, currentUserId);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(subjectRepository, times(1)).save(any(Subject.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsEmpty() {
        SubjectReq invalidReq =
                new SubjectReq("", "Description", "tag1,tag2", "#000000", false, "updated-subject");

        assertThrows(
                ValidationException.class,
                () -> subjectService.update(shelveId, subjectId, invalidReq));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsNull() {
        SubjectReq invalidReq =
                new SubjectReq(
                        null, "Description", "tag1,tag2", "#000000", false, "updated-subject");

        assertThrows(
                ValidationException.class,
                () -> subjectService.update(shelveId, subjectId, invalidReq));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        SubjectReq updateReq =
                new SubjectReq(
                        "Updated Name",
                        "Updated Description",
                        "tag1,tag2",
                        "#000000",
                        false,
                        "updated-subject");

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> subjectService.update(shelveId, subjectId, updateReq));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void update_throwsNotFoundException_whenCollectionNotFound() {
        SubjectReq updateReq =
                new SubjectReq(
                        "Updated Name",
                        "Updated Description",
                        "tag1,tag2",
                        "#000000",
                        false,
                        "updated-subject");

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> subjectService.update(shelveId, subjectId, updateReq));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void delete_softDeletesCollectionAndCards() {
        List<Card> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Card card = new Card();
            card.setId(UUID.randomUUID());
            card.setDeleted(false);
            cards.add(card);
        }
        subject.setCards(cards);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(any(Subject.class))).thenReturn(subject);

        ApiRes result = subjectService.delete(shelveId, subjectId);

        assertNotNull(result);
        assertTrue(subject.getDeleted());
        for (Card card : cards) {
            assertTrue(card.getDeleted());
        }
        verify(subjectRepository, times(1)).save(subject);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.delete(shelveId, subjectId));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.delete(shelveId, subjectId));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void getById_returnsSubject() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.countBySubjects(anyList()))
                .thenReturn(List.of(new SubjectCount(subjectId, 10)));
        when(cardRepository.countDueBySubjects(anyList()))
                .thenReturn(List.of(new SubjectCount(subjectId, 3)));

        ApiRes result = subjectService.getById(shelveId, subjectId);

        assertNotNull(result);
        SubjectRes view = (SubjectRes) result.getBody().data();
        assertEquals(3, view.overdue());
        assertEquals(70.0, view.completedPercent());
        verify(shelfRepository, times(1)).findByIdAndUserId(shelveId, currentUserId);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).countBySubjects(anyList());
        verify(cardRepository, times(1)).countDueBySubjects(anyList());
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getById(shelveId, subjectId));
        verify(subjectRepository, never()).findByIdAndShelve(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getById(shelveId, subjectId));
    }

    @Test
    void getAllByShelve_withPagination_returnsSubjects() {
        List<Subject> collections = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Subject col = new Subject();
            col.setId(UUID.randomUUID());
            col.setName("Subject " + i);
            col.setDescription("Description " + i);
            col.setShelf(shelve);
            collections.add(col);
        }

        Page<Subject> page = new PageImpl<>(collections, PageRequest.of(0, 10), 3);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findAllByShelve(eq(shelve), any(Pageable.class))).thenReturn(page);
        when(cardRepository.countBySubjects(anyList()))
                .thenReturn(
                        List.of(
                                new SubjectCount(collections.get(0).getId(), 4),
                                new SubjectCount(collections.get(1).getId(), 2)));
        when(cardRepository.countDueBySubjects(anyList()))
                .thenReturn(List.of(new SubjectCount(collections.get(0).getId(), 1)));

        ApiRes result = subjectService.getAllByShelve(shelveId, 1, 10);

        assertNotNull(result);
        @SuppressWarnings("unchecked")
        PagingRes<SubjectRes> paging = (PagingRes<SubjectRes>) result.getBody().data();
        assertEquals(1, paging.entities().get(0).overdue());
        assertEquals(75.0, paging.entities().get(0).completedPercent());
        assertEquals(0, paging.entities().get(1).overdue());
        assertEquals(100.0, paging.entities().get(1).completedPercent());
        assertEquals(0, paging.entities().get(2).overdue());
        assertEquals(0.0, paging.entities().get(2).completedPercent());
        verify(shelfRepository, times(1)).findByIdAndUserId(shelveId, currentUserId);
        verify(subjectRepository, times(1)).findAllByShelve(eq(shelve), any(Pageable.class));
        verify(cardRepository, times(1)).countBySubjects(anyList());
        verify(cardRepository, times(1)).countDueBySubjects(anyList());
    }

    @Test
    void getAllByShelve_throwsNotFoundException_whenDeckNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.getAllByShelve(shelveId, 1, 10));
        verify(subjectRepository, never()).findAllByShelve(any(), any());
    }

    // Fallback Function Tests
    @Test
    void createFallback_throwsRuntimeException() {
        SubjectReq request =
                new SubjectReq("Test", "Description", "tag1,tag2", "#FFFFFF", true, "test-subject");
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
        SubjectReq request =
                new SubjectReq(
                        "Updated",
                        "New Description",
                        "tag1,tag2",
                        "#000000",
                        false,
                        "updated-subject");
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
                                        shelveId,
                                        new SubjectReq(
                                                "Test",
                                                "Desc",
                                                "tag1,tag2",
                                                "#FFFFFF",
                                                true,
                                                "test-subject"),
                                        cause));
        assertTrue(createEx.getMessage().contains("try again later"));
    }

    @Test
    void updateSetting_updatesDailyLimits() {
        SubjectSettingReq req = new SubjectSettingReq(40, 15, 1.5);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(subject)).thenReturn(subject);

        ApiRes result = subjectService.updateSetting(shelveId, subjectId, req);

        assertTrue(result.getBody().isSuccess());
        assertEquals(40, subject.getDailyLimit());
        assertEquals(15, subject.getNewCardsPerDay());
        assertEquals(1.5, subject.getInterval());
    }

    @Test
    void discoverPublicDecks_blankQuery_usesFindAllPublic() {
        Page<Subject> page = new PageImpl<>(List.of(subject), PageRequest.of(0, 10), 1);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findAllPublic(eq(currentUserId), any(Pageable.class)))
                .thenReturn(page);

        ApiRes result = subjectService.discoverPublicDecks("  ", 0, 10);

        assertTrue(result.getBody().isSuccess());
        verify(subjectRepository).findAllPublic(eq(currentUserId), any(Pageable.class));
        verify(subjectRepository, never()).findPublicByQuery(any(), any(), any());
    }

    @Test
    void discoverPublicDecks_withQuery_usesFindPublicByQuery() {
        Page<Subject> page = new PageImpl<>(List.of(subject), PageRequest.of(0, 10), 1);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findPublicByQuery(
                        eq("java"), eq(currentUserId), any(Pageable.class)))
                .thenReturn(page);

        ApiRes result = subjectService.discoverPublicDecks("java", 0, 10);

        assertTrue(result.getBody().isSuccess());
        verify(subjectRepository)
                .findPublicByQuery(eq("java"), eq(currentUserId), any(Pageable.class));
    }

    @Test
    void cloneDeck_clonesPublicSubjectWithCards() {
        subject.setIsPublic(true);
        ownedByAnotherUser();
        subject.setDeleted(false);
        Card live = new Card();
        live.setId(UUID.randomUUID());
        live.setFront("Q");
        live.setBack("A");
        live.setDeleted(false);
        Card deleted = new Card();
        deleted.setId(UUID.randomUUID());
        deleted.setDeleted(true);
        subject.setCards(List.of(live, deleted));

        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(shelfRepository.findAllByUserId(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelve)));
        when(subjectRepository.save(any(Subject.class)))
                .thenAnswer(
                        inv -> {
                            Subject s = inv.getArgument(0);
                            s.setId(UUID.randomUUID());
                            return s;
                        });
        when(cardRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ApiRes result = subjectService.cloneDeck(subjectId, null);

        assertEquals(201, result.getStatusCode().value());
        verify(cardRepository).saveAll(anyList());
    }

    @Test
    void cloneDeck_returnsBadRequest_whenNoShelves() {
        subject.setIsPublic(true);
        ownedByAnotherUser();
        subject.setDeleted(false);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(shelfRepository.findAllByUserId(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ApiRes result = subjectService.cloneDeck(subjectId, null);

        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void cloneDeck_throwsNotFound_whenNotPublic() {
        subject.setIsPublic(false);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));

        assertThrows(NotFoundException.class, () -> subjectService.cloneDeck(subjectId, null));
    }

    @Test
    void delete_withNullCards_stillSoftDeletesSubject() {
        subject.setCards(null);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(subjectRepository.save(subject)).thenReturn(subject);

        ApiRes result = subjectService.delete(shelveId, subjectId);

        assertTrue(result.getBody().isSuccess());
        assertTrue(subject.getDeleted());
    }

    @Test
    void unwrapFallbacks_rethrowKnownExceptions() {
        NotFoundException nfe = new NotFoundException("missing");
        assertSame(
                nfe,
                assertThrows(
                        NotFoundException.class,
                        () -> subjectService.createFallback(shelveId, subjectReq, nfe)));
        ValidationException ve = new ValidationException("bad");
        assertThrows(
                ValidationException.class,
                () -> subjectService.updateFallback(shelveId, subjectId, subjectReq, ve));
        com.app.oopsly.api.shared.exception.UnauthenticatedException ue =
                new com.app.oopsly.api.shared.exception.UnauthenticatedException("auth");
        assertThrows(
                com.app.oopsly.api.shared.exception.UnauthenticatedException.class,
                () -> subjectService.deleteFallback(shelveId, subjectId, ue));
    }

    @Test
    void discoverPublicDecks_nullQuery_usesFindAllPublic() {
        Page<Subject> page = new PageImpl<>(List.of(subject), PageRequest.of(0, 10), 1);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findAllPublic(eq(currentUserId), any(Pageable.class)))
                .thenReturn(page);

        subjectService.discoverPublicDecks(null, 0, 10);
        verify(subjectRepository).findAllPublic(eq(currentUserId), any(Pageable.class));
    }

    @Test
    void cloneDeck_throwsWhenDeletedPublicSubject() {
        subject.setIsPublic(true);
        ownedByAnotherUser();
        subject.setDeleted(true);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        assertThrows(NotFoundException.class, () -> subjectService.cloneDeck(subjectId, null));
    }

    @Test
    void cloneDeck_intoChosenShelf_skipsFirstShelfLookup() {
        subject.setIsPublic(true);
        ownedByAnotherUser();
        subject.setDeleted(false);
        subject.setCards(List.of());
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.save(any(Subject.class)))
                .thenAnswer(
                        inv -> {
                            Subject s = inv.getArgument(0);
                            s.setId(UUID.randomUUID());
                            return s;
                        });

        ApiRes result = subjectService.cloneDeck(subjectId, shelveId);

        assertEquals(201, result.getStatusCode().value());
        verify(shelfRepository, never()).findAllByUserId(any(), any(Pageable.class));
        org.mockito.ArgumentCaptor<Subject> saved =
                org.mockito.ArgumentCaptor.forClass(Subject.class);
        verify(subjectRepository).save(saved.capture());
        assertSame(shelve, saved.getValue().getShelf());
        assertFalse(saved.getValue().getIsPublic());
    }

    @Test
    void cloneDeck_intoAnotherUsersShelf_throwsNotFound() {
        subject.setIsPublic(true);
        ownedByAnotherUser();
        subject.setDeleted(false);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> subjectService.cloneDeck(subjectId, shelveId));
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    private void ownedByAnotherUser() {
        Shelf other = new Shelf();
        other.setId(UUID.randomUUID());
        other.setUserId(UUID.randomUUID());
        subject.setShelf(other);
    }

    @Test
    void discoverPublicDecks_asksOnlyForDecksTheUserDoesNotHave() {
        Page<Subject> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findPublicByQuery(eq("x"), eq(currentUserId), any(Pageable.class)))
                .thenReturn(page);

        subjectService.discoverPublicDecks("x", 0, 10);

        verify(subjectRepository)
                .findPublicByQuery(eq("x"), eq(currentUserId), any(Pageable.class));
    }

    @Test
    void cloneDeck_ownDeck_isRejectedWithConflict() {
        subject.setIsPublic(true);
        subject.setDeleted(false);
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));

        ApiRes result = subjectService.cloneDeck(subjectId, null);

        assertEquals(409, result.getStatusCode().value());
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void cloneDeck_alreadyCloned_isRejectedWithConflict() {
        subject.setIsPublic(true);
        subject.setDeleted(false);
        ownedByAnotherUser();
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(subjectRepository.hasCloneOf(subjectId, currentUserId)).thenReturn(true);

        ApiRes result = subjectService.cloneDeck(subjectId, null);

        assertEquals(409, result.getStatusCode().value());
        verify(subjectRepository, never()).save(any(Subject.class));
    }

    @Test
    void cloneDeck_remembersTheSourceDeck() {
        subject.setIsPublic(true);
        subject.setDeleted(false);
        subject.setCards(List.of());
        ownedByAnotherUser();
        when(currentUser.id()).thenReturn(currentUserId);
        when(subjectRepository.findById(subjectId)).thenReturn(Optional.of(subject));
        when(shelfRepository.findAllByUserId(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelve)));
        when(subjectRepository.save(any(Subject.class))).thenAnswer(inv -> inv.getArgument(0));

        subjectService.cloneDeck(subjectId, null);

        org.mockito.ArgumentCaptor<Subject> saved =
                org.mockito.ArgumentCaptor.forClass(Subject.class);
        verify(subjectRepository).save(saved.capture());
        assertEquals(subjectId, saved.getValue().getClonedFromId());
    }
}
