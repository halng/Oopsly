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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.repository.UserRepository;
import com.app.osmosis.api.service.DeckService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.CreateDeck;
import com.app.osmosis.api.viewmodel.DeckResponse;
import com.app.osmosis.api.viewmodel.UpdateDeck;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class DeckServiceImpl implements DeckService {

    private final DeckRepository deckRepository;
    private final UserRepository userRepository;

    public DeckServiceImpl(DeckRepository deckRepository, UserRepository userRepository) {
        this.deckRepository = deckRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public ApiRes createDeck(CreateDeck createDeck, UUID userId) {
        log.info("Creating deck with name: {} for user: {}", createDeck.name(), userId);

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new NotFoundException("User not found"));

        DeckEntity deck =
                DeckEntity.builder()
                        .name(createDeck.name())
                        .description(createDeck.description())
                        .user(user)
                        .isDeleted(false)
                        .build();

        DeckEntity savedDeck = deckRepository.save(deck);
        DeckResponse response = mapToResponse(savedDeck);

        log.info("Deck created successfully with id: {}", savedDeck.getId());
        return ApiRes.created("Deck created successfully", response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiRes getAllDecks(Pageable pageable) {
        log.info("Fetching all non-deleted decks with pagination: {}", pageable);

        Page<DeckEntity> decks = deckRepository.findByIsDeletedFalse(pageable);
        Page<DeckResponse> response = decks.map(this::mapToResponse);

        log.info("Retrieved {} decks", decks.getTotalElements());
        return ApiRes.ok("Decks retrieved successfully", response);
    }

    @Override
    @Transactional(readOnly = true)
    public ApiRes getDeckById(UUID id) {
        log.info("Fetching deck with id: {}", id);

        DeckEntity deck =
                deckRepository
                        .findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new NotFoundException("Deck not found"));

        DeckResponse response = mapToResponse(deck);

        log.info("Deck retrieved successfully");
        return ApiRes.ok("Deck retrieved successfully", response);
    }

    @Override
    @Transactional
    public ApiRes updateDeck(UUID id, UpdateDeck updateDeck, UUID userId) {
        log.info("Updating deck with id: {} for user: {}", id, userId);

        DeckEntity deck =
                deckRepository
                        .findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new NotFoundException("Deck not found"));

        if (!deck.getUser().getId().equals(userId)) {
            log.warn("User {} attempted to update deck {} owned by another user", userId, id);
            return ApiRes.forbidden("You do not have permission to update this deck");
        }

        deck.setName(updateDeck.name());
        deck.setDescription(updateDeck.description());

        DeckEntity updatedDeck = deckRepository.save(deck);
        DeckResponse response = mapToResponse(updatedDeck);

        log.info("Deck updated successfully");
        return ApiRes.ok("Deck updated successfully", response);
    }

    @Override
    @Transactional
    public ApiRes softDeleteDeck(UUID id, UUID userId) {
        log.info("Soft deleting deck with id: {} for user: {}", id, userId);

        DeckEntity deck =
                deckRepository
                        .findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new NotFoundException("Deck not found"));

        if (!deck.getUser().getId().equals(userId)) {
            log.warn("User {} attempted to delete deck {} owned by another user", userId, id);
            return ApiRes.forbidden("You do not have permission to delete this deck");
        }

        deck.setIsDeleted(true);
        deckRepository.save(deck);

        log.info("Deck soft deleted successfully");
        return ApiRes.ok("Deck deleted successfully");
    }

    private DeckResponse mapToResponse(DeckEntity deck) {
        return new DeckResponse(
                deck.getId(),
                deck.getName(),
                deck.getDescription(),
                deck.getCreatedAt(),
                deck.getUpdatedAt());
    }
}
