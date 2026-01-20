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

import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.ShelveRepository;
import com.app.oopsly.api.service.ShelveService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.PagingRes;
import com.app.oopsly.api.viewmodel.ShelveReq;
import com.app.oopsly.api.viewmodel.ShelveRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.List;
import java.util.UUID;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShelveServiceImpl implements ShelveService {

    private final ShelveRepository shelveRepository;
    private final UserService userService;

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(ShelveReq request) {
        log.info("Creating shelve for user {}", this.currentUser().getId());
        ShelveEntity savedEntity = shelveRepository.save(this.toEntity(request, null));
        return ApiRes.success("Created successfully", this.toViewModel(savedEntity));
    }

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(ShelveReq request, UUID id) {
        log.info("Updating shelve {} for user {}", id, this.currentUser().getId());
        ShelveEntity existingEntity =
                shelveRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        ShelveEntity newEntity = this.toEntity(request, existingEntity);
        shelveRepository.save(newEntity);
        return ApiRes.success("Updated successfully");
    }

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID id) {
        log.info("Deleting shelve {} for user {}", id, this.currentUser().getId());
        ShelveEntity existingEntity =
                shelveRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        existingEntity.setDeleted(true);
        shelveRepository.save(existingEntity);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID id) {
        log.info("Fetching shelve {} for user {}", id, this.currentUser().getId());
        ShelveEntity entity =
                shelveRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));
        return ApiRes.success("Fetched successfully", this.toViewModel(entity));
    }

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "getAllFallback")
    public ApiRes getAll(int page, int size) {
        log.info(
                "Fetching shelves page {} size {} for user {}",
                page,
                size,
                this.currentUser().getId());
        Pageable pageable = PageRequest.of(page, size);
        Page<ShelveEntity> pageData = shelveRepository.findAllByUser(this.currentUser(), pageable);
        List<ShelveRes> entities = pageData.getContent().stream().map(this::toViewModel).toList();

        PagingRes<ShelveRes> response =
                new PagingRes<>(
                        entities,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    ShelveEntity toEntity(@NonNull ShelveReq from, ShelveEntity to) {
        if (to == null) {
            User currentUser = this.currentUser();
            return ShelveEntity.builder()
                    .name(from.name())
                    .description(from.description())
                    .user(currentUser)
                    .build();
        }

        to.setName(from.name());
        to.setDescription(from.description());
        return to;
    }

    ShelveRes toViewModel(ShelveEntity from) {
        return new ShelveRes(from.getId(), from.getName(), from.getDescription(), List.of());
    }

    User currentUser() {
        return userService.getCurrentUser();
    }

    /** FALLBACK METHODS */

    // Fallback method for create
    public ApiRes createFallback(ShelveReq request, Throwable t) {
        log.error("Shelve service unavailable during create");
        throw new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getAll
    public ApiRes getAllFallback(int page, int size, Throwable t) {
        log.error("Shelve service unavailable during getAll: {}", t.getMessage());
        throw new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID id, Throwable t) {
        log.error("Shelve service unavailable during getById: {}", t.getMessage());
        throw new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID id, Throwable t) {
        log.error("Shelve service unavailable during delete: {}", t.getMessage());
        throw new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }

    // Fallback method for update
    public ApiRes updateFallback(ShelveReq request, UUID id, Throwable t) {
        log.error("Shelve service unavailable during update: {}", t.getMessage());
        throw new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }
}
