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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.ShelveRepository;
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

    @Mock private ShelveRepository shelveRepository;

    @Mock private UserService userService;

    @InjectMocks private CardServiceImpl cardService;

    private CardReq cardReq;
    private User currentUser;
    private ShelveEntity shelve;
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
        shelve = new ShelveEntity();
        shelve.setId(shelveId);
        shelve.setUser(currentUser);
        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setShelve(shelve);
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.saveAllAndFlush(anyList())).thenReturn(savedCards);

        ApiRes result = cardService.create(shelveId, subjectId, request);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).saveAllAndFlush(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.create(shelveId, subjectId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject))
                .thenReturn(Optional.of(existingCard));
        when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));

        ApiRes result = cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq);

        assertNotNull(result);
        assertEquals(DifficultyLevel.GOOD, existingCard.getDifficultyLevel());
        assertNotNull(existingCard.getNextPracticeTime());
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findByIdAndSubject(cardId, subject);
        verify(cardRepository, times(1)).saveAll(any());
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenDeckNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.EASY.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject))
                .thenReturn(Optional.of(existingCard));

        ApiRes result = cardService.getById(shelveId, subjectId, cardId);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findByIdAndSubject(cardId, subject);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(shelveId, subjectId, cardId));
        verify(cardRepository, never()).findByIdAndSubject(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findAllBySubject(eq(subject), any(Pageable.class)))
                .thenReturn(page);

        ApiRes result = cardService.getAllCardsBySubject(shelveId, subjectId, 0, 10);

        assertNotNull(result);
        verify(shelveRepository, times(1)).findByIdAndUser(shelveId, currentUser);
        verify(subjectRepository, times(1)).findByIdAndShelve(subjectId, shelve);
        verify(cardRepository, times(1)).findAllBySubject(eq(subject), any(Pageable.class));
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.getAllCardsBySubject(shelveId, subjectId, 0, 10));
        verify(cardRepository, never()).findAllBySubject(any(), any());
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        Instant expected = before.plus(1, ChronoUnit.MINUTES);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_hard_returnsTenMinutesLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.HARD);
        Instant expected = before.plus(10, ChronoUnit.MINUTES);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_good_returnsOneDayLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.GOOD);
        Instant expected = before.plus(1, ChronoUnit.DAYS);

        assertTrue(result.isAfter(before));
        assertTrue(result.isBefore(expected.plus(1, ChronoUnit.SECONDS)));
    }

    @Test
    void calculateNextPracticeTime_easy_returnsFourDaysLater() {
        Instant before = Instant.now();
        Instant result = cardService.calculateNextPracticeTime(DifficultyLevel.EASY);
        Instant expected = before.plus(4, ChronoUnit.DAYS);

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
            when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
            when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                    .thenReturn(Optional.of(subject));
            when(cardRepository.findByIdAndSubject(cardId, subject))
                    .thenReturn(Optional.of(existingCard));
            when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));

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
}
