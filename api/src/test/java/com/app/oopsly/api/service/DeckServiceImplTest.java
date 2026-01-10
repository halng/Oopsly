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

import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.DeckServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
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
class DeckServiceImplTest {

    @Mock private DeckRepository deckRepository;

    @Mock private UserService userService;

    @InjectMocks private DeckServiceImpl deckService;

    private DeckReq deckReq;
    private User currentUser;
    private UUID deckId;

    @BeforeEach
    void setUp() {
        deckReq =
                new DeckReq(
                        "Sample Deck",
                        "A deck for testing purposes with sufficient description length to meet"
                                + " validation");
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        deckId = UUID.randomUUID();
    }

    @Test
    void create_savesNewDeck() {
        DeckEntity savedDeck = new DeckEntity();
        savedDeck.setId(deckId);
        savedDeck.setName(deckReq.name());
        savedDeck.setDescription(deckReq.description());
        savedDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(savedDeck);

        ApiRes result = deckService.create(deckReq);

        assertNotNull(result);
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }

    @Test
    void update_updatesExistingDeck() {
        DeckEntity existingDeck = new DeckEntity();
        existingDeck.setId(deckId);
        existingDeck.setName("Old Name");
        existingDeck.setDescription("Old Description with sufficient length");
        existingDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(existingDeck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(existingDeck);

        ApiRes result = deckService.update(deckReq, deckId);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.update(deckReq, deckId));
        verify(deckRepository, never()).save(any(DeckEntity.class));
    }

    @Test
    void delete_softDeletesDeck() {
        DeckEntity existingDeck = new DeckEntity();
        existingDeck.setId(deckId);
        existingDeck.setDeleted(false);
        existingDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(existingDeck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(existingDeck);

        ApiRes result = deckService.delete(deckId);

        assertNotNull(result);
        assertTrue(existingDeck.getDeleted());
        verify(deckRepository, times(1)).save(existingDeck);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.delete(deckId));
    }

    @Test
    void getById_returnsDeck() {
        DeckEntity existingDeck = new DeckEntity();
        existingDeck.setId(deckId);
        existingDeck.setUser(currentUser);
        existingDeck.setName(deckReq.name());
        existingDeck.setDescription(deckReq.description());

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(existingDeck));

        ApiRes result = deckService.getById(deckId);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> deckService.getById(deckId));
    }

    @Test
    void create_withMultipleDecks_createsAll() {
        DeckEntity savedDeck = new DeckEntity();
        savedDeck.setId(UUID.randomUUID());
        savedDeck.setName(deckReq.name());
        savedDeck.setDescription(deckReq.description());
        savedDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(savedDeck);

        // Create multiple decks
        ApiRes result1 = deckService.create(deckReq);
        ApiRes result2 = deckService.create(deckReq);

        assertNotNull(result1);
        assertNotNull(result2);
        verify(deckRepository, times(2)).save(any(DeckEntity.class));
    }

    @Test
    void update_withSameData_stillSaves() {
        DeckEntity existingDeck = new DeckEntity();
        existingDeck.setId(deckId);
        existingDeck.setName(deckReq.name());
        existingDeck.setDescription(deckReq.description());
        existingDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(existingDeck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(existingDeck);

        ApiRes result = deckService.update(deckReq, deckId);

        assertNotNull(result);
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }

    @Test
    void delete_alreadyDeleted_stillMarksAsDeleted() {
        DeckEntity existingDeck = new DeckEntity();
        existingDeck.setId(deckId);
        existingDeck.setDeleted(true); // Already deleted
        existingDeck.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(existingDeck));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(existingDeck);

        ApiRes result = deckService.delete(deckId);

        assertNotNull(result);
        assertTrue(existingDeck.getDeleted());
        verify(deckRepository, times(1)).save(existingDeck);
    }

    @Test
    void getAll_withPagination_delegatesToService() {
        List<DeckEntity> decks = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            DeckEntity deck = new DeckEntity();
            deck.setId(UUID.randomUUID());
            deck.setName("Deck " + i);
            deck.setDescription(
                    "Description " + i + " with sufficient length for validation requirements");
            decks.add(deck);
        }

        Page<DeckEntity> page = new PageImpl<>(decks, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(page);

        ApiRes result = deckService.getAll(0, 10);

        assertNotNull(result);
        verify(deckRepository, times(1)).findAllByUser(eq(currentUser), any(Pageable.class));
    }
}
