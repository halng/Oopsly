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
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.CardServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardReq;
import java.time.Instant;
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
    private Instant nextPracticeTime;

    @BeforeEach
    void setUp() {
        nextPracticeTime = Instant.now().plusSeconds(86400);
        cardReq =
                new CardReq(
                        "Sample Topic",
                        "Sample Answer for testing purposes",
                        CardEntity.DifficultyLevel.EASY,
                        nextPracticeTime);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        deckId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        deck = new DeckEntity();
        deck.setId(deckId);
        deck.setUser(currentUser);
    }

    @Test
    void toEntity_withNullExisting_createsNewEntity() {
        CardEntity result = cardService.toEntity(cardReq, null);

        assertNotNull(result);
        assertEquals(cardReq.topic(), result.getTopic());
        assertEquals(cardReq.answer(), result.getAnswer());
        assertEquals(cardReq.difficultyLevel(), result.getDifficultyLevel());
        assertEquals(cardReq.nextPracticeTime(), result.getNextPracticeTime());
    }

    @Test
    void toEntity_withExistingEntity_updatesEntity() {
        CardEntity existing = new CardEntity();
        existing.setTopic("Old Topic");
        existing.setAnswer("Old Answer");
        existing.setDifficultyLevel(CardEntity.DifficultyLevel.HARD);
        existing.setDeck(deck);

        CardEntity result = cardService.toEntity(cardReq, existing);

        assertSame(existing, result);
        assertEquals(cardReq.topic(), result.getTopic());
        assertEquals(cardReq.answer(), result.getAnswer());
        assertEquals(cardReq.difficultyLevel(), result.getDifficultyLevel());
        assertEquals(cardReq.nextPracticeTime(), result.getNextPracticeTime());
    }

    @Test
    void toViewModel_convertsEntityToViewModel() {
        CardEntity entity = new CardEntity();
        entity.setTopic("Test Topic");
        entity.setAnswer("Test Answer");
        entity.setDifficultyLevel(CardEntity.DifficultyLevel.GOOD);
        entity.setNextPracticeTime(nextPracticeTime);

        CardReq result = cardService.toViewModel(entity);

        assertNotNull(result);
        assertEquals(entity.getTopic(), result.topic());
        assertEquals(entity.getAnswer(), result.answer());
        assertEquals(entity.getDifficultyLevel(), result.difficultyLevel());
        assertEquals(entity.getNextPracticeTime(), result.nextPracticeTime());
    }

    @Test
    void create_savesNewCard() {
        CardEntity savedCard = new CardEntity();
        savedCard.setId(cardId);
        savedCard.setTopic(cardReq.topic());
        savedCard.setAnswer(cardReq.answer());
        savedCard.setDifficultyLevel(cardReq.difficultyLevel());
        savedCard.setNextPracticeTime(cardReq.nextPracticeTime());
        savedCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(savedCard);

        ApiRes result = cardService.create(deckId, cardReq);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).save(any(CardEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.create(deckId, cardReq));
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void update_updatesExistingCard() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setTopic("Old Topic");
        existingCard.setAnswer("Old Answer");
        existingCard.setDifficultyLevel(CardEntity.DifficultyLevel.HARD);
        existingCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        ApiRes result = cardService.update(deckId, cardId, cardReq);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(cardRepository, times(1)).findByIdAndDeck(cardId, deck);
        verify(cardRepository, times(1)).save(any(CardEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.update(deckId, cardId, cardReq));
        verify(cardRepository, never()).findByIdAndDeck(any(), any());
        verify(cardRepository, never()).save(any(CardEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenCardNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> cardService.update(deckId, cardId, cardReq));
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
    void toEntity_withAllDifficultyLevels() {
        for (CardEntity.DifficultyLevel level : CardEntity.DifficultyLevel.values()) {
            CardReq req = new CardReq("Topic", "Answer", level, nextPracticeTime);
            CardEntity result = cardService.toEntity(req, null);
            assertEquals(level, result.getDifficultyLevel());
        }
    }

    @Test
    void toEntity_withNullDifficultyLevel_createsEntityWithNull() {
        CardReq reqWithNullDifficulty = new CardReq("Topic", "Answer", null, null);
        CardEntity result = cardService.toEntity(reqWithNullDifficulty, null);
        assertNull(result.getDifficultyLevel());
        assertNull(result.getNextPracticeTime());
    }

    @Test
    void create_withDifferentDifficultyLevels_savesCorrectly() {
        for (CardEntity.DifficultyLevel level : CardEntity.DifficultyLevel.values()) {
            CardReq req = new CardReq("Topic", "Answer", level, nextPracticeTime);

            CardEntity savedCard = new CardEntity();
            savedCard.setId(UUID.randomUUID());
            savedCard.setTopic(req.topic());
            savedCard.setAnswer(req.answer());
            savedCard.setDifficultyLevel(req.difficultyLevel());
            savedCard.setNextPracticeTime(req.nextPracticeTime());
            savedCard.setDeck(deck);

            when(userService.getCurrentUser()).thenReturn(currentUser);
            when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
            when(cardRepository.save(any(CardEntity.class))).thenReturn(savedCard);

            ApiRes result = cardService.create(deckId, req);
            assertNotNull(result);
        }
    }

    @Test
    void update_preservesDeck() {
        CardEntity existingCard = new CardEntity();
        existingCard.setId(cardId);
        existingCard.setTopic("Old Topic");
        existingCard.setAnswer("Old Answer");
        existingCard.setDeck(deck);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(cardRepository.findByIdAndDeck(cardId, deck)).thenReturn(Optional.of(existingCard));
        when(cardRepository.save(any(CardEntity.class))).thenReturn(existingCard);

        cardService.update(deckId, cardId, cardReq);

        assertEquals(deck, existingCard.getDeck());
    }
}
