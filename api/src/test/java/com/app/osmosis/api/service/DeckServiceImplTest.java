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

import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.repository.UserRepository;
import com.app.osmosis.api.service.impl.DeckServiceImpl;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.CreateDeck;
import com.app.osmosis.api.viewmodel.UpdateDeck;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class DeckServiceImplTest {

    @Mock private DeckRepository deckRepository;

    @Mock private UserRepository userRepository;

    private DeckServiceImpl deckService;

    private UUID userId;
    private UUID deckId;
    private User user;
    private DeckEntity deck;

    @BeforeEach
    void setUp() {
        deckService = new DeckServiceImpl(deckRepository, userRepository);
        userId = UUID.randomUUID();
        deckId = UUID.randomUUID();

        user = User.builder().id(userId).email("test@example.com").name("Test User").build();

        deck =
                DeckEntity.builder()
                        .id(deckId)
                        .name("Test Deck")
                        .description("Test Description")
                        .user(user)
                        .isDeleted(false)
                        .build();
        deck.setCreatedAt(Instant.now());
        deck.setUpdatedAt(Instant.now());
    }

    @Test
    void createDeck_whenUserExists_createsAndReturnsDeck() {
        CreateDeck createDeck = new CreateDeck("New Deck", "Description");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

        ApiRes result = deckService.createDeck(createDeck, userId);

        assertEquals(HttpStatus.CREATED, result.getStatusCode());
        verify(userRepository).findById(userId);
        verify(deckRepository).save(any(DeckEntity.class));
    }

    @Test
    void createDeck_whenUserNotFound_throwsNotFoundException() {
        CreateDeck createDeck = new CreateDeck("New Deck", "Description");
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.createDeck(createDeck, userId));
        verify(userRepository).findById(userId);
        verify(deckRepository, never()).save(any());
    }

    @Test
    void getAllDecks_returnsPageOfDecks() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<DeckEntity> page = new PageImpl<>(java.util.List.of(deck));
        when(deckRepository.findByIsDeletedFalse(pageable)).thenReturn(page);

        ApiRes result = deckService.getAllDecks(pageable);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(deckRepository).findByIsDeletedFalse(pageable);
    }

    @Test
    void getDeckById_whenDeckExists_returnsDeck() {
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));

        ApiRes result = deckService.getDeckById(deckId);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
    }

    @Test
    void getDeckById_whenDeckNotFound_throwsNotFoundException() {
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.getDeckById(deckId));
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
    }

    @Test
    void updateDeck_whenUserOwnsDeck_updatesDeck() {
        UpdateDeck updateDeck = new UpdateDeck("Updated Deck", "Updated Description");
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

        ApiRes result = deckService.updateDeck(deckId, updateDeck, userId);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository).save(deck);
    }

    @Test
    void updateDeck_whenUserDoesNotOwnDeck_returnsForbidden() {
        UUID otherUserId = UUID.randomUUID();
        UpdateDeck updateDeck = new UpdateDeck("Updated Deck", "Updated Description");
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));

        ApiRes result = deckService.updateDeck(deckId, updateDeck, otherUserId);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository, never()).save(any());
    }

    @Test
    void updateDeck_whenDeckNotFound_throwsNotFoundException() {
        UpdateDeck updateDeck = new UpdateDeck("Updated Deck", "Updated Description");
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> deckService.updateDeck(deckId, updateDeck, userId));
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository, never()).save(any());
    }

    @Test
    void softDeleteDeck_whenUserOwnsDeck_softDeletesDeck() {
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

        ApiRes result = deckService.softDeleteDeck(deckId, userId);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository).save(deck);
        assertTrue(deck.getIsDeleted());
    }

    @Test
    void softDeleteDeck_whenUserDoesNotOwnDeck_returnsForbidden() {
        UUID otherUserId = UUID.randomUUID();
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));

        ApiRes result = deckService.softDeleteDeck(deckId, otherUserId);

        assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository, never()).save(any());
    }

    @Test
    void softDeleteDeck_whenDeckNotFound_throwsNotFoundException() {
        when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.softDeleteDeck(deckId, userId));
        verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
        verify(deckRepository, never()).save(any());
    }
}
