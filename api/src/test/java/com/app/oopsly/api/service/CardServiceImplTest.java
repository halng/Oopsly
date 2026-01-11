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
import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.CollectionRepository;
import com.app.oopsly.api.repository.DeckRepository;
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

    @Mock private CollectionRepository collectionRepository;

    @Mock private DeckRepository deckRepository;

    @Mock private UserService userService;

    @InjectMocks private CardServiceImpl cardService;

    private CardReq cardReq;
    private User currentUser;
    private DeckEntity deck;
    private CollectionEntity collection;
    private UUID deckId;
    private UUID collectionId;
    private UUID cardId;
    private List<UpdateDifficultyReq> updateDifficultyReq;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Sample Topic", "Sample Answer"));
        cardReq = new CardReq(cardItems);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        deckId = UUID.randomUUID();
        collectionId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        deck = new DeckEntity();
        deck.setId(deckId);
        deck.setUser(currentUser);
        collection = new CollectionEntity();
        collection.setId(collectionId);
        collection.setDeck(deck);
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
            card.setCollection(collection);
            savedCards.add(card);
        }

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.saveAllAndFlush(anyList())).thenReturn(savedCards);

        ApiRes result = cardService.create(deckId, collectionId, request);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
        verify(cardRepository, times(1)).saveAllAndFlush(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.create(deckId, collectionId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.create(deckId, collectionId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void updateDifficulty_updatesDifficultyLevelAndNextPracticeTime() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setFront("Topic");
        existingCard.setBack("Answer");
        existingCard.setCollection(collection);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection))
                .thenReturn(Optional.of(existingCard));
        when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));

        ApiRes result = cardService.updateDifficulty(deckId, collectionId, updateDifficultyReq);

        assertNotNull(result);
        assertEquals(DifficultyLevel.GOOD, existingCard.getDifficultyLevel());
        assertNotNull(existingCard.getNextPracticeTime());
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
        verify(cardRepository, times(1)).findByIdAndCollection(cardId, collection);
        verify(cardRepository, times(1)).saveAll(any());
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenDeckNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.EASY.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(deckId, collectionId, updateDifficultyReq));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenCollectionNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.EASY.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(deckId, collectionId, updateDifficultyReq));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void updateDifficulty_throwsNotFoundException_whenCardNotFound() {
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.HARD.name()));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.updateDifficulty(deckId, collectionId, updateDifficultyReq));
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void delete_softDeletesCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setDeleted(false);
        existingCard.setCollection(collection);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection))
                .thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        ApiRes result = cardService.delete(deckId, collectionId, cardId);

        assertNotNull(result);
        assertTrue(existingCard.getDeleted());
        verify(cardRepository, times(1)).save(existingCard);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(deckId, collectionId, cardId));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(deckId, collectionId, cardId));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.delete(deckId, collectionId, cardId));
    }

    @Test
    void getById_returnsCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setCollection(collection);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection))
                .thenReturn(Optional.of(existingCard));

        ApiRes result = cardService.getById(deckId, collectionId, cardId);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
        verify(cardRepository, times(1)).findByIdAndCollection(cardId, collection);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(deckId, collectionId, cardId));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(deckId, collectionId, cardId));
        verify(cardRepository, never()).findByIdAndCollection(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findByIdAndCollection(cardId, collection)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> cardService.getById(deckId, collectionId, cardId));
    }

    @Test
    void getAll_CardsByCollection_withPagination_returnsCards() {
        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card = new CardEntity();
            card.setId(UUID.randomUUID());
            card.setFront("Topic " + i);
            card.setBack("Answer " + i);
            card.setCollection(collection);
            cards.add(card);
        }

        Page<CardEntity> page = new PageImpl<>(cards, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(cardRepository.findAllByCollection(eq(collection), any(Pageable.class)))
                .thenReturn(page);

        ApiRes result = cardService.getAllCardsByCollection(deckId, collectionId, 0, 10);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
        verify(cardRepository, times(1)).findAllByCollection(eq(collection), any(Pageable.class));
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.getAllCardsByCollection(deckId, collectionId, 0, 10));
        verify(cardRepository, never()).findAllByCollection(any(), any());
    }

    @Test
    void getAll_CardsByCollection_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.getAllCardsByCollection(deckId, collectionId, 0, 10));
        verify(cardRepository, never()).findAllByCollection(any(), any());
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
            existingCard.setCollection(collection);

            when(userService.getCurrentUser()).thenReturn(currentUser);
            when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
            when(collectionRepository.findByIdAndDeck(collectionId, deck))
                    .thenReturn(Optional.of(collection));
            when(cardRepository.findByIdAndCollection(cardId, collection))
                    .thenReturn(Optional.of(existingCard));
            when(cardRepository.saveAll(any())).thenReturn(List.of(existingCard));

            ApiRes result =
                    cardService.updateDifficulty(
                            deckId,
                            collectionId,
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

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () -> cardService.createFallback(deckId, collectionId, request, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void deleteFallback_throwsRuntimeException() {
        RuntimeException cause = new RuntimeException("Database connection lost");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () -> cardService.deleteFallback(deckId, collectionId, cardId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getByIdFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Circuit breaker triggered");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () -> cardService.getByIdFallback(deckId, collectionId, cardId, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void getAllCardsByCollectionFallback_throwsRuntimeException() {
        Throwable cause = new Throwable("Service degraded");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                cardService.getAllCardsByCollectionFallback(
                                        deckId, collectionId, 0, 10, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateCardFallback_throwsRuntimeException() {
        CardItemReq item = new CardItemReq("Updated Front", "Updated Back");
        RuntimeException cause = new RuntimeException("Network error");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                cardService.updateCardFallback(
                                        deckId, collectionId, cardId, item, cause));

        assertNotNull(exception);
        assertTrue(exception.getMessage().contains("currently unavailable"));
        assertSame(cause, exception.getCause());
    }

    @Test
    void updateDifficultyFallback_throwsRuntimeException() {
        List<UpdateDifficultyReq> reqList =
                List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        Throwable cause = new Throwable("Timeout");

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                cardService.updateDifficultyFallback(
                                        deckId, collectionId, reqList, cause));

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

        RuntimeException exception =
                assertThrows(
                        RuntimeException.class,
                        () ->
                                cardService.createFallback(
                                        deckId, collectionId, request, wrappedException));

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
                                        deckId,
                                        collectionId,
                                        new CardReq(List.of(new CardItemReq("F", "B"))),
                                        cause));
        RuntimeException deleteEx =
                assertThrows(
                        RuntimeException.class,
                        () -> cardService.deleteFallback(deckId, collectionId, cardId, cause));

        assertTrue(createEx.getMessage().contains("try again later"));
        assertTrue(deleteEx.getMessage().contains("try again later"));
    }
}
