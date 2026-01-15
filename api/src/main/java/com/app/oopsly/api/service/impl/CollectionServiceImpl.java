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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CollectionRepository;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.CollectionService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CollectionReq;
import com.app.oopsly.api.viewmodel.CollectionRes;
import com.app.oopsly.api.viewmodel.PagingRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollectionServiceImpl implements CollectionService {

    private final CollectionRepository collectionRepository;
    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    @CacheEvict(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':all'")
    @CircuitBreaker(name = "collectionServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID deckId, CollectionReq request) {
        log.info("Creating collection for deck: {}", deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);

        CollectionEntity collection =
                CollectionEntity.builder()
                        .name(request.name())
                        .description(request.description())
                        .deck(deck)
                        .build();

        CollectionEntity savedCollection = collectionRepository.save(collection);
        log.info("Successfully created collection: {}", savedCollection.getId());

        return ApiRes.success("Created successfully", toCollectionRes(savedCollection));
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':' + #collectionId"),
                @CacheEvict(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':all'")
            })
    @CircuitBreaker(name = "collectionServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(UUID deckId, UUID collectionId, CollectionReq request) {
        log.info("Updating collection: {} in deck: {}", collectionId, deckId);

        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new ValidationException("Collection name cannot be empty");
        }

        DeckEntity deck = getDeckForCurrentUser(deckId);
        CollectionEntity existingCollection =
                collectionRepository
                        .findByIdAndDeck(collectionId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection not found with id: " + collectionId));

        existingCollection.setName(request.name());
        existingCollection.setDescription(request.description());
        CollectionEntity updatedCollection = collectionRepository.save(existingCollection);

        log.info("Successfully updated collection: {}", collectionId);
        return ApiRes.success("Updated successfully", toCollectionRes(updatedCollection));
    }

    @Override
    @Transactional
    @Caching(
            evict = {
                @CacheEvict(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':' + #collectionId"),
                @CacheEvict(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':all'")
            })
    @CircuitBreaker(name = "collectionServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID deckId, UUID collectionId) {
        log.info("Deleting collection: {} from deck: {}", collectionId, deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CollectionEntity existingCollection =
                collectionRepository
                        .findByIdAndDeck(collectionId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection not found with id: " + collectionId));

        existingCollection.setDeleted(true);
        if (existingCollection.getCards() != null) {
            existingCollection.getCards().forEach(card -> card.setDeleted(true));
        }
        collectionRepository.save(existingCollection);

        log.info("Successfully deleted collection: {} and associated cards", collectionId);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @Cacheable(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':' + #collectionId")
    @CircuitBreaker(name = "collectionServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID deckId, UUID collectionId) {
        log.info("Getting collection: {} from deck: {}", collectionId, deckId);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        CollectionEntity collection =
                collectionRepository
                        .findByIdAndDeck(collectionId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Collection not found with id: " + collectionId));

        log.info("Successfully retrieved collection: {}", collectionId);
        return ApiRes.success("Fetched successfully", toCollectionRes(collection));
    }

    @Override
    @Cacheable(value = "collections", key = "#root.target.getCurrentUserId() + ':' + #deckId + ':all'")
    @CircuitBreaker(
            name = "collectionServiceCircuitBreaker",
            fallbackMethod = "getAllByDeckFallback")
    public ApiRes getAllByDeck(UUID deckId, int page, int size) {
        log.info(
                "Getting all collections for deck: {} with page: {} and size: {}",
                deckId,
                page,
                size);
        DeckEntity deck = getDeckForCurrentUser(deckId);
        Pageable pageable = PageRequest.of(page, size);
        Page<CollectionEntity> pageData = collectionRepository.findAllByDeck(deck, pageable);
        List<CollectionRes> collections =
                pageData.getContent().stream()
                        .map(this::toCollectionRes)
                        .collect(Collectors.toList());

        PagingRes<CollectionRes> pagingRes =
                new PagingRes<>(
                        collections,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());

        log.info(
                "Successfully retrieved {} collections for deck: {} (total: {})",
                collections.size(),
                deckId,
                pageData.getTotalElements());
        return ApiRes.success("Fetched successfully", pagingRes);
    }

    private CollectionRes toCollectionRes(CollectionEntity entity) {
        return new CollectionRes(entity.getId(), entity.getName(), entity.getDescription());
    }

    private DeckEntity getDeckForCurrentUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        log.debug(
                "Getting deck: {} for user: {}",
                deckId,
                StringUtils.masked(currentUser.getEmail()));
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }

    public UUID getCurrentUserId() {
        return userService.getCurrentUser().getId();
    }

    // Fallback methods for Circuit Breaker
    // Fallback method for getAllByDeck
    public ApiRes getAllByDeckFallback(UUID deckId, int page, int size, Throwable t) {
        log.error("Collection service unavailable during getAllByDeck: {}", t.getMessage());
        throw new RetryLaterException(
                "Collection service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID deckId, UUID collectionId, Throwable t) {
        log.error("Collection service unavailable during getById: {}", t.getMessage());
        throw new RetryLaterException(
                "Collection service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID deckId, UUID collectionId, Throwable t) {
        log.error("Collection service unavailable during delete: {}", t.getMessage());
        throw new RetryLaterException(
                "Collection service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for update
    public ApiRes updateFallback(
            UUID deckId, UUID collectionId, CollectionReq request, Throwable t) {
        log.error("Collection service unavailable during update: {}", t.getMessage());
        throw new RetryLaterException(
                "Collection service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for create
    public ApiRes createFallback(UUID deckId, CollectionReq request, Throwable t) {
        log.error("Collection service unavailable during create: {}", t.getMessage());
        throw new RetryLaterException(
                "Collection service is currently unavailable. Please try again later.", t);
    }
}
