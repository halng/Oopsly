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
import com.app.osmosis.api.exception.UnauthenticatedException;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.repository.UserRepository;
import com.app.osmosis.api.service.impl.DeckServiceImpl;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.DeckReq;
import com.app.osmosis.api.viewmodel.UpdateDeckReq;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class DeckServiceImplTest {

    @Mock private DeckRepository deckRepository;

    @Mock private UserRepository userRepository;

    @Mock private SecurityContext securityContext;

    @Mock private Authentication authentication;

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
    void createDeck_whenUserExists_thenReturnsCreated() {
        DeckReq deckReq = new DeckReq("New Deck", "Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            ApiRes result = deckService.createDeck(deckReq);

            assertEquals(HttpStatus.CREATED, result.getStatusCode());
            assertNotNull(result.getBody());
            assertTrue(result.getBody().message().contains("created"));
            verify(userRepository).findById(userId);
            verify(deckRepository).save(any(DeckEntity.class));
        }
    }

    @Test
    void createDeck_withNullDescription_thenReturnsCreated() {
        DeckReq deckReq = new DeckReq("New Deck", null);

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            ApiRes result = deckService.createDeck(deckReq);

            assertEquals(HttpStatus.CREATED, result.getStatusCode());
            verify(userRepository).findById(userId);
            verify(deckRepository).save(any(DeckEntity.class));
        }
    }

    @Test
    void createDeck_whenUserNotFound_thenThrowsNotFoundException() {
        DeckReq deckReq = new DeckReq("New Deck", "Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> deckService.createDeck(deckReq));
            verify(userRepository).findById(userId);
            verify(deckRepository, never()).save(any());
        }
    }

    @Test
    void createDeck_whenUserNotAuthenticated_thenThrowsUnauthenticatedException() {
        DeckReq deckReq = new DeckReq("New Deck", "Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(null);

            assertThrows(UnauthenticatedException.class, () -> deckService.createDeck(deckReq));
            verify(userRepository, never()).findById(any());
            verify(deckRepository, never()).save(any());
        }
    }

    @Test
    void getAllDecks_whenDecksExist_thenReturnsPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<DeckEntity> page = new PageImpl<>(java.util.List.of(deck));

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByUserIdAndIsDeletedFalse(userId, pageable)).thenReturn(page);

            ApiRes result = deckService.getAllDecks(pageable);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByUserIdAndIsDeletedFalse(userId, pageable);
        }
    }

    @Test
    void getAllDecks_whenEmpty_thenReturnsEmptyPage() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<DeckEntity> emptyPage = new PageImpl<>(java.util.List.of());

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByUserIdAndIsDeletedFalse(userId, pageable))
                    .thenReturn(emptyPage);

            ApiRes result = deckService.getAllDecks(pageable);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByUserIdAndIsDeletedFalse(userId, pageable);
        }
    }

    @Test
    void getAllDecks_withMultipleDecks_thenReturnsAllDecks() {
        Pageable pageable = PageRequest.of(0, 10);
        DeckEntity deck2 =
                DeckEntity.builder()
                        .id(UUID.randomUUID())
                        .name("Deck 2")
                        .description("Description 2")
                        .user(user)
                        .isDeleted(false)
                        .build();
        deck2.setCreatedAt(Instant.now());
        deck2.setUpdatedAt(Instant.now());

        Page<DeckEntity> page = new PageImpl<>(java.util.List.of(deck, deck2));

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByUserIdAndIsDeletedFalse(userId, pageable)).thenReturn(page);

            ApiRes result = deckService.getAllDecks(pageable);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByUserIdAndIsDeletedFalse(userId, pageable);
        }
    }

    @Test
    void getDeckById_whenDeckExists_thenReturnsDeck() {
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByIdAndUserIdAndIsDeletedFalse(deckId, userId))
                    .thenReturn(Optional.of(deck));

            ApiRes result = deckService.getDeckById(deckId);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByIdAndUserIdAndIsDeletedFalse(deckId, userId);
        }
    }

    @Test
    void getDeckById_whenDeckExists_thenReturnsCorrectDeckData() {
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByIdAndUserIdAndIsDeletedFalse(deckId, userId))
                    .thenReturn(Optional.of(deck));

            ApiRes result = deckService.getDeckById(deckId);

            assertNotNull(result.getBody());
            assertNotNull(result.getBody().data());
            verify(deckRepository).findByIdAndUserIdAndIsDeletedFalse(deckId, userId);
        }
    }

    @Test
    void getDeckById_whenDeckNotFound_thenThrowsNotFoundException() {
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());
            when(deckRepository.findByIdAndUserIdAndIsDeletedFalse(deckId, userId))
                    .thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> deckService.getDeckById(deckId));
            verify(deckRepository).findByIdAndUserIdAndIsDeletedFalse(deckId, userId);
        }
    }

    @Test
    void updateDeck_whenUserOwnsDeck_thenUpdatesSuccessfully() {
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("Updated Deck", "Updated Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            ApiRes result = deckService.updateDeck(deckId, updateDeckReq);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository).save(deck);
        }
    }

    @Test
    void updateDeck_whenCalled_thenActuallyUpdatesFields() {
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("Updated Name", "Updated Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            deckService.updateDeck(deckId, updateDeckReq);

            assertEquals("Updated Name", deck.getName());
            assertEquals("Updated Description", deck.getDescription());
            verify(deckRepository).save(deck);
        }
    }

    @Test
    void updateDeck_withNullDescription_thenUpdatesFields() {
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("New Name", null);

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            deckService.updateDeck(deckId, updateDeckReq);

            assertEquals("New Name", deck.getName());
            assertNull(deck.getDescription());
            verify(deckRepository).save(deck);
        }
    }

    @Test
    void updateDeck_whenUserDoesNotOwnDeck_thenReturnsForbidden() {
        UUID otherUserId = UUID.randomUUID();
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("Updated Deck", "Updated Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(otherUserId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));

            ApiRes result = deckService.updateDeck(deckId, updateDeckReq);

            assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository, never()).save(any());
        }
    }

    @Test
    void updateDeck_whenDeckNotFound_thenThrowsNotFoundException() {
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("Updated Deck", "Updated Description");

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.empty());

            assertThrows(
                    NotFoundException.class, () -> deckService.updateDeck(deckId, updateDeckReq));
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository, never()).save(any());
        }
    }

    @Test
    void softDeleteDeck_whenUserOwnsDeck_thenSoftDeletesSuccessfully() {
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            ApiRes result = deckService.softDeleteDeck(deckId);

            assertEquals(HttpStatus.OK, result.getStatusCode());
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository).save(deck);
            assertTrue(deck.getIsDeleted());
        }
    }

    @Test
    void softDeleteDeck_whenCalled_thenSetsIsDeletedToTrue() {
        assertFalse(deck.getIsDeleted());

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));
            when(deckRepository.save(any(DeckEntity.class))).thenReturn(deck);

            deckService.softDeleteDeck(deckId);

            assertTrue(deck.getIsDeleted());
            verify(deckRepository).save(deck);
        }
    }

    @Test
    void softDeleteDeck_whenUserDoesNotOwnDeck_thenReturnsForbidden() {
        UUID otherUserId = UUID.randomUUID();

        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(otherUserId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.of(deck));

            ApiRes result = deckService.softDeleteDeck(deckId);

            assertEquals(HttpStatus.FORBIDDEN, result.getStatusCode());
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository, never()).save(any());
        }
    }

    @Test
    void softDeleteDeck_whenDeckNotFound_thenThrowsNotFoundException() {
        try (MockedStatic<SecurityContextHolder> mockedSecurityContextHolder =
                mockStatic(SecurityContextHolder.class)) {
            mockedSecurityContextHolder
                    .when(SecurityContextHolder::getContext)
                    .thenReturn(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getName()).thenReturn(userId.toString());

            when(deckRepository.findByIdAndIsDeletedFalse(deckId)).thenReturn(Optional.empty());

            assertThrows(NotFoundException.class, () -> deckService.softDeleteDeck(deckId));
            verify(deckRepository).findByIdAndIsDeletedFalse(deckId);
            verify(deckRepository, never()).save(any());
        }
    }
}
