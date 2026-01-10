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
import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CollectionRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.CollectionServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CollectionReq;
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
class CollectionServiceImplTest {

    @Mock private CollectionRepository collectionRepository;

    @Mock private DeckRepository deckRepository;

    @Mock private UserService userService;

    @InjectMocks private CollectionServiceImpl collectionService;

    private User currentUser;
    private DeckEntity deck;
    private CollectionEntity collection;
    private UUID deckId;
    private UUID collectionId;
    private CollectionReq collectionReq;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        deckId = UUID.randomUUID();
        collectionId = UUID.randomUUID();

        deck = new DeckEntity();
        deck.setId(deckId);
        deck.setUser(currentUser);

        collection = new CollectionEntity();
        collection.setId(collectionId);
        collection.setName("Test Collection");
        collection.setDescription("Test Description");
        collection.setDeck(deck);

        collectionReq = new CollectionReq("Test Collection", "Test Description");
    }

    @Test
    void create_savesCollection() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.save(any(CollectionEntity.class))).thenReturn(collection);

        ApiRes result = collectionService.create(deckId, collectionReq);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).save(any(CollectionEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> collectionService.create(deckId, collectionReq));
        verify(collectionRepository, never()).save(any(CollectionEntity.class));
    }

    @Test
    void update_updatesCollection() {
        CollectionReq updateReq = new CollectionReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(collectionRepository.save(any(CollectionEntity.class))).thenReturn(collection);

        ApiRes result = collectionService.update(deckId, collectionId, updateReq);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
        verify(collectionRepository, times(1)).save(any(CollectionEntity.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsEmpty() {
        CollectionReq invalidReq = new CollectionReq("", "Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));

        assertThrows(
                ValidationException.class,
                () -> collectionService.update(deckId, collectionId, invalidReq));
        verify(collectionRepository, never()).save(any(CollectionEntity.class));
    }

    @Test
    void update_throwsValidationException_whenNameIsNull() {
        CollectionReq invalidReq = new CollectionReq(null, "Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));

        assertThrows(
                ValidationException.class,
                () -> collectionService.update(deckId, collectionId, invalidReq));
        verify(collectionRepository, never()).save(any(CollectionEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenDeckNotFound() {
        CollectionReq updateReq = new CollectionReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> collectionService.update(deckId, collectionId, updateReq));
        verify(collectionRepository, never()).findByIdAndDeck(any(), any());
    }

    @Test
    void update_throwsNotFoundException_whenCollectionNotFound() {
        CollectionReq updateReq = new CollectionReq("Updated Name", "Updated Description");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> collectionService.update(deckId, collectionId, updateReq));
        verify(collectionRepository, never()).save(any(CollectionEntity.class));
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
        collection.setCards(cards);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));
        when(collectionRepository.save(any(CollectionEntity.class))).thenReturn(collection);

        ApiRes result = collectionService.delete(deckId, collectionId);

        assertNotNull(result);
        assertTrue(collection.getDeleted());
        for (CardEntity card : cards) {
            assertTrue(card.getDeleted());
        }
        verify(collectionRepository, times(1)).save(collection);
    }

    @Test
    void delete_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> collectionService.delete(deckId, collectionId));
        verify(collectionRepository, never()).findByIdAndDeck(any(), any());
    }

    @Test
    void delete_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> collectionService.delete(deckId, collectionId));
        verify(collectionRepository, never()).save(any(CollectionEntity.class));
    }

    @Test
    void getById_returnsCollection() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.of(collection));

        ApiRes result = collectionService.getById(deckId, collectionId);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findByIdAndDeck(collectionId, deck);
    }

    @Test
    void getById_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> collectionService.getById(deckId, collectionId));
        verify(collectionRepository, never()).findByIdAndDeck(any(), any());
    }

    @Test
    void getById_throwsNotFoundException_whenCollectionNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findByIdAndDeck(collectionId, deck))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> collectionService.getById(deckId, collectionId));
    }

    @Test
    void getAllByDeck_withPagination_returnsCollections() {
        List<CollectionEntity> collections = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CollectionEntity col = new CollectionEntity();
            col.setId(UUID.randomUUID());
            col.setName("Collection " + i);
            col.setDescription("Description " + i);
            col.setDeck(deck);
            collections.add(col);
        }

        Page<CollectionEntity> page = new PageImpl<>(collections, PageRequest.of(0, 10), 3);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.of(deck));
        when(collectionRepository.findAllByDeck(eq(deck), any(Pageable.class))).thenReturn(page);

        ApiRes result = collectionService.getAllByDeck(deckId, 0, 10);

        assertNotNull(result);
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(collectionRepository, times(1)).findAllByDeck(eq(deck), any(Pageable.class));
    }

    @Test
    void getAllByDeck_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(deckRepository.findByIdAndUser(deckId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> collectionService.getAllByDeck(deckId, 0, 10));
        verify(collectionRepository, never()).findAllByDeck(any(), any());
    }
}
