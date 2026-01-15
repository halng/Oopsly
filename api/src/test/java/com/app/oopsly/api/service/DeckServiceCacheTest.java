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
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.impl.DeckServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@ExtendWith({SpringExtension.class, MockitoExtension.class})
@ContextConfiguration(classes = DeckServiceCacheTest.TestCacheConfig.class)
class DeckServiceCacheTest {

    @Configuration
    @EnableCaching
    static class TestCacheConfig {
        @Bean
        public CacheManager cacheManager() {
            CaffeineCacheManager cacheManager = new CaffeineCacheManager();
            cacheManager.setCaffeine(
                    Caffeine.newBuilder().maximumSize(100).expireAfterAccess(10, TimeUnit.MINUTES));
            return cacheManager;
        }
    }

    @Mock private DeckRepository deckRepository;

    @Mock private UserService userService;

    private DeckServiceImpl deckService;

    private CacheManager cacheManager;

    private User currentUser;
    private UUID deckId;
    private DeckEntity deckEntity;

    @BeforeEach
    void setUp() {
        cacheManager = new TestCacheConfig().cacheManager();

        // Create a real instance with mocked dependencies
        deckService = new DeckServiceImpl(deckRepository, userService);

        currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setEmail("test@example.com");

        deckId = UUID.randomUUID();
        deckEntity = new DeckEntity();
        deckEntity.setId(deckId);
        deckEntity.setName("Test Deck");
        deckEntity.setDescription("Test Description");
        deckEntity.setUser(currentUser);

        when(userService.getCurrentUser()).thenReturn(currentUser);
    }

    @Test
    void getById_callsRepositoryOnFirstCall() {
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(deckEntity));

        // First call - should hit the database
        ApiRes result1 = deckService.getById(deckId);
        assertNotNull(result1);

        // Verify repository was called
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
    }

    @Test
    void create_callsRepository() {
        DeckReq deckReq = new DeckReq("New Deck", "New Description");
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deckEntity);

        // Create a deck
        ApiRes result = deckService.create(deckReq);
        assertNotNull(result);

        // Verify repository was called
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }

    @Test
    void update_callsRepository() {
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(deckEntity));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deckEntity);

        // Update a deck
        DeckReq updateReq = new DeckReq("Updated Deck", "Updated Description");
        ApiRes result = deckService.update(updateReq, deckId);
        assertNotNull(result);

        // Verify repository was called
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }

    @Test
    void delete_callsRepository() {
        when(deckRepository.findByIdAndUser(deckId, currentUser))
                .thenReturn(Optional.of(deckEntity));
        when(deckRepository.save(any(DeckEntity.class))).thenReturn(deckEntity);

        // Delete a deck
        ApiRes result = deckService.delete(deckId);
        assertNotNull(result);

        // Verify repository was called
        verify(deckRepository, times(1)).findByIdAndUser(deckId, currentUser);
        verify(deckRepository, times(1)).save(any(DeckEntity.class));
    }
}
