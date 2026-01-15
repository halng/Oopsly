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

import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.DeckService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import com.app.oopsly.api.viewmodel.DeckRes;
import com.app.oopsly.api.viewmodel.PagingRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.List;
import java.util.UUID;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeckServiceImpl implements DeckService {

    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    @CacheEvict(value = "decks", key = "#root.target.getCurrentUserId() + ':all'")
    @CircuitBreaker(name = "deckServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(DeckReq request) {
        log.info("Creating deck for user {}", this.currentUser().getId());
        DeckEntity savedEntity = deckRepository.save(this.toEntity(request, null));
        return ApiRes.success("Created successfully", this.toViewModel(savedEntity));
    }

    @Override
    @CacheEvict(value = "decks", key = "#root.target.getCurrentUserId() + ':' + #id")
    @CircuitBreaker(name = "deckServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(DeckReq request, UUID id) {
        log.info("Updating deck {} for user {}", id, this.currentUser().getId());
        DeckEntity existingEntity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        DeckEntity newEntity = this.toEntity(request, existingEntity);
        deckRepository.save(newEntity);
        return ApiRes.success("Updated successfully");
    }

    @Override
    @CacheEvict(value = "decks", key = "#root.target.getCurrentUserId() + ':' + #id")
    @CircuitBreaker(name = "deckServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID id) {
        log.info("Deleting deck {} for user {}", id, this.currentUser().getId());
        DeckEntity existingEntity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        existingEntity.setDeleted(true);
        deckRepository.save(existingEntity);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @Cacheable(value = "decks", key = "#root.target.getCurrentUserId() + ':' + #id")
    @CircuitBreaker(name = "deckServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID id) {
        log.info("Fetching deck {} for user {}", id, this.currentUser().getId());
        DeckEntity entity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));
        return ApiRes.success("Fetched successfully", this.toViewModel(entity));
    }

    @Override
    @Cacheable(value = "decks", key = "#root.target.getCurrentUserId() + ':all'")
    @CircuitBreaker(name = "deckServiceCircuitBreaker", fallbackMethod = "getAllFallback")
    public ApiRes getAll(int page, int size) {
        log.info(
                "Fetching decks page {} size {} for user {}",
                page,
                size,
                this.currentUser().getId());
        Pageable pageable = PageRequest.of(page, size);
        Page<DeckEntity> pageData = deckRepository.findAllByUser(this.currentUser(), pageable);
        List<DeckRes> entities = pageData.getContent().stream().map(this::toViewModel).toList();

        PagingRes<DeckRes> response =
                new PagingRes<>(
                        entities,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    DeckEntity toEntity(@NonNull DeckReq from, DeckEntity to) {
        if (to == null) {
            User currentUser = this.currentUser();
            return DeckEntity.builder()
                    .name(from.name())
                    .description(from.description())
                    .user(currentUser)
                    .build();
        }

        to.setName(from.name());
        to.setDescription(from.description());
        return to;
    }

    DeckRes toViewModel(DeckEntity from) {
        return new DeckRes(from.getId(), from.getName(), from.getDescription(), List.of());
    }

    User currentUser() {
        return userService.getCurrentUser();
    }

    public UUID getCurrentUserId() {
        return currentUser().getId();
    }

    /** FALLBACK METHODS */

    // Fallback method for create
    public ApiRes createFallback(DeckReq request, Throwable t) {
        log.error("Deck service unavailable during create");
        throw new RetryLaterException(
                "Deck service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getAll
    public ApiRes getAllFallback(int page, int size, Throwable t) {
        log.error("Deck service unavailable during getAll: {}", t.getMessage());
        throw new RetryLaterException(
                "Deck service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID id, Throwable t) {
        log.error("Deck service unavailable during getById: {}", t.getMessage());
        throw new RetryLaterException(
                "Deck service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID id, Throwable t) {
        log.error("Deck service unavailable during delete: {}", t.getMessage());
        throw new RetryLaterException(
                "Deck service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for update
    public ApiRes updateFallback(DeckReq request, UUID id, Throwable t) {
        log.error("Deck service unavailable during update: {}", t.getMessage());
        throw new RetryLaterException(
                "Deck service is currently unavailable. Please try again later.", t);
    }
}
