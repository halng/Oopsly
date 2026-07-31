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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.service.impl.CardServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.UpdateDifficultyReq;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class CardServiceImplTest {

    @Mock private CardRepository cardRepository;

    @Mock private SubjectRepository subjectRepository;

    @Mock private ShelfRepository shelfRepository;

    @Mock private TestSuiteRepository testSuiteRepository;

    @Mock private UserService userService;

    @InjectMocks private CardServiceImpl cardService;

    private CardReq cardReq;
    private User currentUser;
    private ShelfEntity shelve;
    private SubjectEntity subject;
    private UUID shelveId;
    private UUID subjectId;
    private UUID cardId;
    private List<UpdateDifficultyReq> updateDifficultyReq;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Sample Topic", "Sample Answer"));
        cardReq = new CardReq(cardItems);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        shelve = new ShelfEntity();
        shelve.setId(shelveId);
        shelve.setUser(currentUser);
        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setShelf(shelve);
    }

    @Test
    void create_savesMultipleCards() {
        List<CardItemReq> cardItems =
                List.of(
                        new CardItemReq("Topic 1", "Answer 1"),
                        new CardItemReq("Topic 2", "Answer 2"));
        CardReq request = new CardReq(cardItems);

        List<CardEntity> savedCards = new ArrayList<>();
        for (int i = 0; i < 2; i++) {
            CardEntity card = new CardEntity();
            card.setId(UUID.randomUUID());
            card.setFront(cardItems.get(i).front());
            card.setBack(cardItems.get(i).back());
            card.setSubject(subject);
            savedCards.add(card);
        }

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.saveAllAndFlush(anyList())).thenReturn(savedCards);

        ApiRes result = cardService.create(shelveId, subjectId, request);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).saveAllAndFlush(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.create(shelveId, subjectId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.create(shelveId, subjectId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void updateDifficulty_updatesDifficultyLevelAndNextPracticeTime() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setFront("Topic");
        existingCard.setBack("Answer");
        existingCard.setSubject(subject);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject))
                .thenReturn(Optional.of(existingCard));
        when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));
        doNothing().when(userService).updateUserProgress(anyInt());

        ApiRes result = cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq);

        assertNotNull(result);
        assertEquals(DifficultyLevel.GOOD, existingCard.getDifficultyLevel());
        assertNotNull(existingCard.getNextPracticeTime());
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findByIdAndSubject(cardId, subject);
        verify(cardRepository, times(1)).saveAll(any());
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenDeckNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.EASY.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenCollectionNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.EASY.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenCardNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.HARD.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq));
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void delete_softDeletesCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setDeleted(false);
        existingCard.setSubject(subject);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject))
                .thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        ApiRes result = cardService.delete(shelveId, subjectId, cardId);

        assertNotNull(result);
        assertTrue(existingCard.getDeleted());
        verify(cardRepository, times(1)).save(existingCard);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(shelveId, subjectId, cardId));
    }

    @Test
    void getById_returnsCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setSubject(subject);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject))
                .thenReturn(Optional.of(existingCard));

        ApiRes result = cardService.getById(shelveId, subjectId, cardId);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findByIdAndSubject(cardId, subject);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(shelveId, subjectId, cardId));
    }

    @Test
    void getAll_CardsByCollection_withPagination_returnsCards() {
        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card = new CardEntity();
            card.setId(UUID.randomUUID());
            card.setFront("Topic " + i);
            card.setBack("Answer " + i);
            card.setSubject(subject);
            cards.add(card);
        }

        Page<CardEntity> page = new PageImpl<>(cards, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findAllBySubject(eq(subject), any(Pageable.class))).thenReturn(page);

        ApiRes result = cardService.getAllCardsBySubject(shelveId, subjectId, 0, 10);

        assertNotNull(result);
        verify(shelfRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findAllBySubject(eq(subject), any(Pageable.class));
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.getAllCardsBySubject(shelveId, subjectId, 0, 10));
        verify(cardRepository, never()).findAllBySubject(any(), any());
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.getAllCardsBySubject(shelveId, subjectId, 0, 10));
        verify(cardRepository, never()).findAllBySubject(any(), any());
    }

    @Test
    void calculateNextPracticeTime_again_returnsOneMinuteLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.AGAIN);
        Instant expected = before.plus(10, ChronoUnit.MINUTES);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_hard_returnsTenMinutesLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.HARD);
        Instant expected = before.plus(1, ChronoUnit.DAYS);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_good_returnsOneDayLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.GOOD);
        Instant expected = before.plus(3, ChronoUnit.DAYS);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_easy_returnsFourDaysLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.EASY);
        Instant expected = before.plus(15, ChronoUnit.DAYS);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void updateDifficulty_withAllDifficultyLevels_calculatesCorrectNextPracticeTime() {
        for (DifficultyLevel level : DifficultyLevel.values()) {
            CardEntity existingCard = new CardEntity();
            existingCard.setId(cardId);
            existingCard.setFront("Topic");
            existingCard.setBack("Answer");
            existingCard.setSubject(subject);

            when(userService.getCurrentUser()).thenReturn(currentUser);
            when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                    .thenReturn(Optional.of(shelve));
            when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                    .thenReturn(Optional.of(subject));
            when(cardRepository.findByIdAndSubject(cardId, subject))
                    .thenReturn(Optional.of(existingCard));
            when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));
            doNothing().when(userService).updateUserProgress(anyInt());

            ApiRes result =
                    cardService.updateDifficulty(
                            shelveId,
                            subjectId,
                            List.of(new UpdateDifficultyReq(cardId, level.name())));
            assertNotNull(result);
            assertEquals(level, existingCard.getDifficultyLevel());
            assertNotNull(existingCard.getNextPracticeTime());
        }
    }

    // Fallback Function Tests
    @Test
    void createFallback_throwsRuntimeException() {
        CardReq request = new CardReq(List.of(new CardItemReq("Front", "Back")));
        RuntimeException cause = new RuntimeException("Service unavailable");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.createFallback(shelveId, subjectId, request, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void deleteFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Database connection lost");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.deleteFallback(shelveId, subjectId, cardId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getByIdFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Circuit breaker triggered");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.getByIdFallback(shelveId, subjectId, cardId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getAllCardsBySubjectFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Service degraded");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                cardService.getAllCardsBySubjectFallback(
                                        shelveId, subjectId, 0, 10, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateCard_updatesFrontAndBack() {
        CardEntity card = new CardEntity();
        card.setId(cardId);
        card.setFront("old");
        card.setBack("old");
        card.setSubject(subject);
        CardItemReq item = new CardItemReq("New Front", "New Back");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
        when(cardRepository.save(card)).thenReturn(card);

        ApiRes result = cardService.updateCard(shelveId, subjectId, cardId, item);

        assertTrue(result.getBody().isSuccess());
        assertEquals("New Front", card.getFront());
        assertEquals("New Back", card.getBack());
    }

    @Test
    void getDueCards_returnsDueList() {
        CardEntity card = new CardEntity();
        card.setId(cardId);
        card.setFront("Q");
        card.setBack("A");
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findDueBySubjectAndLimit(
                        eq(subject), any(Instant.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(card)));

        ApiRes result = cardService.getDueCards(shelveId, subjectId, 5);

        assertTrue(result.getBody().isSuccess());
        assertEquals(1, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void getShortPracticeStats_zeroCards_returnsZeros() {
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(0L);

        var stats = cardService.getShortPracticeStats(subject);

        assertEquals(0, stats.getLeft());
        assertEquals(0.0, stats.getRight());
    }

    @Test
    void getShortPracticeStats_computesRetention() {
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(10L);
        when(cardRepository.countOverdue(subject)).thenReturn(2L);

        var stats = cardService.getShortPracticeStats(subject);

        assertEquals(2, stats.getLeft());
        assertEquals(80.0, stats.getRight());
    }

    @Test
    void getCardsByTestSuite_aggregatesSubjectCards() {
        UUID suiteId = UUID.randomUUID();
        currentUser.setId(UUID.randomUUID());
        shelve.setUser(currentUser);
        com.app.oopsly.api.entity.TestSuiteEntity suite =
                new com.app.oopsly.api.entity.TestSuiteEntity();
        suite.setId(suiteId);
        suite.setDeleted(false);
        suite.setShelf(shelve);
        suite.setSubjects(List.of(subject));
        CardEntity card = new CardEntity();
        card.setId(cardId);
        card.setFront("Q");
        card.setBack("A");

        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.of(suite));
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(cardRepository.findAllBySubject(eq(subject), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(card)));

        ApiRes result = cardService.getCardsByTestSuite(suiteId);

        assertTrue(result.getBody().isSuccess());
        assertEquals(1, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void getCardsByTestSuite_deletedSuite_throws() {
        UUID suiteId = UUID.randomUUID();
        com.app.oopsly.api.entity.TestSuiteEntity suite =
                new com.app.oopsly.api.entity.TestSuiteEntity();
        suite.setDeleted(true);
        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.of(suite));

        assertThrows(NotFoundException.class, () -> cardService.getCardsByTestSuite(suiteId));
    }

    @Test
    void getCardsByTestSuite_notFound() {
        UUID suiteId = UUID.randomUUID();
        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> cardService.getCardsByTestSuite(suiteId));
    }

    @Test
    void getCardsByTestSuite_wrongOwner_throws() {
        UUID suiteId = UUID.randomUUID();
        currentUser.setId(UUID.randomUUID());
        User other = new User();
        other.setId(UUID.randomUUID());
        ShelfEntity otherShelf = new ShelfEntity();
        otherShelf.setUser(other);
        com.app.oopsly.api.entity.TestSuiteEntity suite =
                new com.app.oopsly.api.entity.TestSuiteEntity();
        suite.setDeleted(false);
        suite.setShelf(otherShelf);
        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.of(suite));
        when(userService.getCurrentUser()).thenReturn(currentUser);

        assertThrows(NotFoundException.class, () -> cardService.getCardsByTestSuite(suiteId));
    }

    @Test
    void getCardsByTestSuite_skipsDeletedSubjectsAndNullSubjects() {
        UUID suiteId = UUID.randomUUID();
        currentUser.setId(UUID.randomUUID());
        shelve.setUser(currentUser);
        SubjectEntity deleted = new SubjectEntity();
        deleted.setId(UUID.randomUUID());
        deleted.setDeleted(true);
        com.app.oopsly.api.entity.TestSuiteEntity suite =
                new com.app.oopsly.api.entity.TestSuiteEntity();
        suite.setDeleted(null);
        suite.setShelf(shelve);
        suite.setSubjects(List.of(deleted));
        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.of(suite));
        when(userService.getCurrentUser()).thenReturn(currentUser);

        ApiRes result = cardService.getCardsByTestSuite(suiteId);

        assertTrue(result.getBody().isSuccess());
        assertEquals(0, ((List<?>) result.getBody().data()).size());
        verify(cardRepository, never()).findAllBySubject(any(), any());
    }

    @Test
    void getCardsByTestSuite_nullSubjects_returnsEmpty() {
        UUID suiteId = UUID.randomUUID();
        currentUser.setId(UUID.randomUUID());
        shelve.setUser(currentUser);
        com.app.oopsly.api.entity.TestSuiteEntity suite =
                new com.app.oopsly.api.entity.TestSuiteEntity();
        suite.setDeleted(false);
        suite.setShelf(shelve);
        suite.setSubjects(null);
        when(testSuiteRepository.findById(suiteId)).thenReturn(Optional.of(suite));
        when(userService.getCurrentUser()).thenReturn(currentUser);

        ApiRes result = cardService.getCardsByTestSuite(suiteId);
        assertEquals(0, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void getDueCardsFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("down");
        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.getDueCardsFallback(shelveId, subjectId, 5, cause));
        assertTrue(exception.getMessage().contains("currently unavailable"));
    }

    @Test
    void updateCardFallback_throwsRuntimeException() {
        CardItemReq item = new CardItemReq("Updated Front", "Updated Back");
        RuntimeException cause = new RuntimeException("Network error");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                cardService.updateCardFallback(
                                        shelveId, subjectId, cardId, item, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateDifficultyFallback_throwsRuntimeException() {
        List<UpdateDifficultyReq> reqList =
                List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        Throwable cause = new Throwable("Timeout");

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                cardService.updateDifficultyFallback(
                                        shelveId, subjectId, reqList, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void fallbackMethods_preserveExceptionChain() {
        Exception originalException = new java.sql.SQLException("Connection timeout");
        RuntimeException wrappedException =
                new RuntimeException("Database error", originalException);
        CardReq request = new CardReq(List.of(new CardItemReq("Front", "Back")));

        RetryLaterException exception =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                cardService.createFallback(
                                        shelveId, subjectId, request, wrappedException));

        assertEquals(wrappedException, exception.getCause());
        assertEquals(originalException, exception.getCause().getCause());
    }

    @Test
    void fallbackMethods_provideConsistentUserFriendlyMessages() {
        Throwable cause = new Throwable("Internal error");

        RuntimeException createEx =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                cardService.createFallback(
                                        shelveId,
                                        subjectId,
                                        new CardReq(List.of(new CardItemReq("F", "B"))),
                                        cause));
        RetryLaterException deleteEx =
                assertThrows(
                        RetryLaterException.class,
                        () -> cardService.deleteFallback(shelveId, subjectId, cardId, cause));

        assertTrue(createEx.getMessage().contains("try again later"));
        assertTrue(deleteEx.getMessage().contains("try again later"));
    }

    @Test
    void fallbackMethods_propagateDomainExceptionsWithoutWrapping() {
        NotFoundException notFound = new NotFoundException("missing card");
        UnauthenticatedException unauthenticated = new UnauthenticatedException("no token");
        ValidationException validation = new ValidationException("bad input");

        assertSame(
                notFound,
                assertThrows(
                        NotFoundException.class,
                        () -> cardService.getByIdFallback(shelveId, subjectId, cardId, notFound)));
        assertSame(
                unauthenticated,
                assertThrows(
                        UnauthenticatedException.class,
                        () ->
                                cardService.createFallback(
                                        shelveId,
                                        subjectId,
                                        new CardReq(List.of(new CardItemReq("F", "B"))),
                                        unauthenticated)));
        assertSame(
                validation,
                assertThrows(
                        ValidationException.class,
                        () ->
                                cardService.getAllCardsBySubjectFallback(
                                        shelveId, subjectId, 0, 10, validation)));
    }
}
