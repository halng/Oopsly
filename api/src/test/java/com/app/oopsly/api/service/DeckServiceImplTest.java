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
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.DeckServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
    void toEntity_withNullExisting_createsNewEntity() {
        when(userService.getCurrentUser()).thenReturn(currentUser);

        DeckEntity result = deckService.toEntity(deckReq, null);

        assertNotNull(result);
        assertEquals(deckReq.name(), result.getName());
        assertEquals(deckReq.description(), result.getDescription());
        assertEquals(currentUser, result.getUser());
    }

    @Test
    void toEntity_withExistingEntity_updatesEntity() {
        DeckEntity existing = new DeckEntity();
        existing.setName("Old Name");
        existing.setDescription("Old Description with sufficient length for validation");
        existing.setUser(currentUser);

        DeckEntity result = deckService.toEntity(deckReq, existing);

        assertSame(existing, result);
        assertEquals(deckReq.name(), result.getName());
        assertEquals(deckReq.description(), result.getDescription());
    }

    @Test
    void toViewModel_convertsEntityToViewModel() {
        DeckEntity entity = new DeckEntity();
        entity.setName("Test Deck");
        entity.setDescription("Test Description with sufficient length for validation");

        DeckReq result = deckService.toViewModel(entity);

        assertNotNull(result);
        assertEquals(entity.getName(), result.name());
        assertEquals(entity.getDescription(), result.description());
    }

    @Test
    void getRepository_returnsDeckRepository() {
        assertSame(deckRepository, deckService.getRepository());
    }

    @Test
    void getCurrentUser_delegatesToUserService() {
        when(userService.getCurrentUser()).thenReturn(currentUser);

        User result = deckService.getCurrentUser();

        assertSame(currentUser, result);
        verify(userService, times(1)).getCurrentUser();
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
}
