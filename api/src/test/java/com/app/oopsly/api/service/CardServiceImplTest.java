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
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.CardServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
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

    @Mock private DeckRepository deckRepository;

    @Mock private UserService userService;

    @InjectMocks private CardServiceImpl cardService;

    private CardReq cardReq;
    private User currentUser;
    private DeckEntity deck;
    private UUID deckId;
    private UUID cardId;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Sample Topic", "Sample Answer"));
        cardReq = new CardReq(cardItems);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        deckId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        deck = new DeckEntity();
        deck.setId(deckId);
        deck.setUser(currentUser);
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
            card.setTopic(cardItems.get(i).topic());
            card.setAnswer(cardItems.get(i).answer());
            card.setDeck(deck);
            savedCards.add(card);
        }

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.saveAll(anyList())).thenReturn(savedCards);

        ApiRes result = cardService.create(deckId, request);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).saveAll(anyList());
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.create(deckId, cardReq));
        verify(cardRepository, never()).saveAll(anyList());
    }

    @Test
    void update_updatesDifficultyLevelAndNextPracticeTime() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setTopic("Topic");
        existingCard.setAnswer("Answer");
        existingCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        ApiRes result = cardService.update(deckId, cardId, DifficultyLevel.GOOD);

        assertNotNull(result);
        assertEquals(DifficultyLevel.GOOD, existingCard.getDifficultyLevel());
        assertNotNull(existingCard.getNextPracticeTime());
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).findByIdAndDeck(cardId, deck);
        verify(cardRepository, times(1)).save(any(CardEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.update(deckId, cardId, DifficultyLevel.EASY));
        verify(cardRepository, never()).findByIdAndDeck(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> cardService.update(deckId, cardId, DifficultyLevel.HARD));
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void delete_softDeletesCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setDeleted(false);
        existingCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        ApiRes result = cardService.delete(deckId, cardId);

        assertNotNull(result);
        assertTrue(existingCard.getDeleted());
        verify(cardRepository, times(1)).save(existingCard);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.delete(deckId, cardId));
        verify(cardRepository, never()).findByIdAndDeck(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.delete(deckId, cardId));
    }

    @Test
    void getById_returnsCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.of(existingCard));

        ApiRes result = cardService.getById(deckId, cardId);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).findByIdAndDeck(cardId, deck);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.getById(deckId, cardId));
        verify(cardRepository, never()).findByIdAndDeck(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.getById(deckId, cardId));
    }

    @Test
    void getAll_withPagination_returnsCards() {
        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card = new CardEntity();
            card.setId(UUID.randomUUID());
            card.setTopic("Topic " + i);
            card.setAnswer("Answer " + i);
            card.setDeck(deck);
            cards.add(card);
        }

        Page<CardEntity> page = new PageImpl<>(cards, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findAllByDeck(eq(deck), any(Pageable.class))).thenReturn(page);

        ApiRes result = cardService.getAll(deckId, 0, 10);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).findAllByDeck(eq(deck), any(Pageable.class));
    }

    @Test
    void getAll_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.getAll(deckId, 0, 10));
        verify(cardRepository, never()).findAllByDeck(any(), any());
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
    void update_withAllDifficultyLevels_calculatesCorrectNextPracticeTime() {
        for (DifficultyLevel level : DifficultyLevel.values()) {
            CardEntity existingCard = new CardEntity();
            existingCard.setId(cardId);
            existingCard.setTopic("Topic");
            existingCard.setAnswer("Answer");
            existingCard.setDeck(deck);

            when(userService.getCurrentUser()).thenReturn(currentUser);
            when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
            when(cardRepository.findByIdAndDeck(cardId, deck))
                    .thenReturn(Optional.of(existingCard));
            when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

            ApiRes result = cardService.update(deckId, cardId, level);
            assertNotNull(result);
            assertEquals(level, existingCard.getDifficultyLevel());
            assertNotNull(existingCard.getNextPracticeTime());
        }
    }
}
