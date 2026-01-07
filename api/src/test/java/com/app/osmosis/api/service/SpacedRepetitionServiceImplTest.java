/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.osmosis.api.entity.CardEntity;
import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.CardRepository;
import com.app.osmosis.api.service.impl.SpacedRepetitionServiceImpl;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SpacedRepetitionServiceImplTest {

    @Mock private CardRepository cardRepository;

    @InjectMocks private SpacedRepetitionServiceImpl spacedRepetitionService;

    private DeckEntity deck;
    private CardEntity card;
    private UUID deckId;
    private UUID cardId;

    @BeforeEach
    void setUp() {
        deckId = UUID.randomUUID();
        cardId = UUID.randomUUID();

        deck = DeckEntity.builder().id(deckId).name("Java Basics").build();

        card =
                CardEntity.builder()
                        .id(cardId)
                        .deck(deck)
                        .prompt("What is JVM?")
                        .answer("Java Virtual Machine")
                        .dueAt(Instant.now().minusSeconds(60))
                        .intervalMinutes(10)
                        .build();
    }

    @Test
    void findNextDueCard_returnsCard_whenDueCardExists() {
        when(cardRepository.findTopByDeck_IdAndDueAtLessThanEqualOrderByDueAtAsc(
                        eq(deckId), any(Instant.class)))
                .thenReturn(Optional.of(card));

        Optional<CardEntity> result = spacedRepetitionService.findNextDueCard(deckId);

        assertTrue(result.isPresent());
        assertEquals(cardId, result.get().getId());
        verify(cardRepository, times(1))
                .findTopByDeck_IdAndDueAtLessThanEqualOrderByDueAtAsc(eq(deckId), any(Instant.class));
    }

    @Test
    void findNextDueCard_returnsEmpty_whenNoDueCardExists() {
        when(cardRepository.findTopByDeck_IdAndDueAtLessThanEqualOrderByDueAtAsc(
                        eq(deckId), any(Instant.class)))
                .thenReturn(Optional.empty());

        Optional<CardEntity> result = spacedRepetitionService.findNextDueCard(deckId);

        assertFalse(result.isPresent());
        verify(cardRepository, times(1))
                .findTopByDeck_IdAndDueAtLessThanEqualOrderByDueAtAsc(eq(deckId), any(Instant.class));
    }

    @Test
    void recordReview_updatesAndSavesCard_whenCorrect() {
        when(cardRepository.findById(cardId)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(CardEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        int originalInterval = card.getIntervalMinutes();

        CardEntity result = spacedRepetitionService.recordReview(cardId, true);

        assertNotNull(result);
        assertTrue(result.getIntervalMinutes() > originalInterval);
        verify(cardRepository, times(1)).findById(cardId);
        verify(cardRepository, times(1)).save(any(CardEntity.class));
    }

    @Test
    void recordReview_resetsInterval_whenIncorrect() {
        card.setIntervalMinutes(20);
        when(cardRepository.findById(cardId)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(CardEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CardEntity result = spacedRepetitionService.recordReview(cardId, false);

        assertNotNull(result);
        assertEquals(5, result.getIntervalMinutes());
        verify(cardRepository, times(1)).findById(cardId);
        verify(cardRepository, times(1)).save(any(CardEntity.class));
    }

    @Test
    void recordReview_throwsNotFoundException_whenCardDoesNotExist() {
        when(cardRepository.findById(cardId)).thenReturn(Optional.empty());

        NotFoundException exception =
                assertThrows(
                        NotFoundException.class,
                        () -> spacedRepetitionService.recordReview(cardId, true));

        assertEquals("Card not found for review", exception.getMessage());
        verify(cardRepository, times(1)).findById(cardId);
        verify(cardRepository, never()).save(any());
    }

    @Test
    void recordReview_updatesAllSchedulingFields() {
        when(cardRepository.findById(cardId)).thenReturn(Optional.of(card));

        ArgumentCaptor<CardEntity> captor = ArgumentCaptor.forClass(CardEntity.class);
        when(cardRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        Instant beforeReview = Instant.now();
        spacedRepetitionService.recordReview(cardId, true);
        Instant afterReview = Instant.now();

        CardEntity saved = captor.getValue();
        assertNotNull(saved.getDueAt());
        assertTrue(saved.getDueAt().isAfter(beforeReview));
        assertTrue(saved.getDueAt().isBefore(afterReview.plusSeconds(saved.getIntervalMinutes() * 60 + 5)));
    }
}
