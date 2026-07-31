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

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.TestSuiteEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.ShelfService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.util.Collections;
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
public class ShelfServiceImpl implements ShelfService {

    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final UserService userService;
    private final CardService cardService;

    @Override
    //    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(ShelfReq request) {
        log.info("Creating shelve for user {}", this.currentUser().getId());
        ShelfEntity savedEntity = shelfRepository.save(this.toEntity(request, null));
        return ApiRes.created("Created successfully", this.toViewModel(savedEntity));
    }

    @Override
    //    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(ShelfReq request, UUID id) {
        log.info("Updating shelve {} for user {}", id, this.currentUser().getId());
        ShelfEntity existingEntity =
                shelfRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        ShelfEntity newEntity = this.toEntity(request, existingEntity);
        shelfRepository.save(newEntity);
        return ApiRes.success("Updated successfully");
    }

    @Override
    @Transactional
    //    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID id) {
        log.info("Deleting shelve {} for user {}", id, this.currentUser().getId());
        ShelfEntity existingEntity =
                shelfRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        List<SubjectEntity> subjects =
                subjectRepository
                        .findAllByShelve(existingEntity, PageRequest.of(0, Integer.MAX_VALUE))
                        .getContent();
        for (SubjectEntity subject : subjects) {
            List<CardEntity> cards =
                    cardRepository
                            .findAllBySubject(subject, PageRequest.of(0, Integer.MAX_VALUE))
                            .getContent();
            cards.forEach(card -> card.setDeleted(true));
            if (!cards.isEmpty()) {
                cardRepository.saveAll(cards);
            }
            subject.setDeleted(true);
            subjectRepository.save(subject);
        }

        List<TestSuiteEntity> testSuites = testSuiteRepository.findAllByShelve(existingEntity);
        testSuites.forEach(testSuite -> testSuite.setDeleted(true));
        if (!testSuites.isEmpty()) {
            testSuiteRepository.saveAll(testSuites);
        }

        existingEntity.setDeleted(true);
        shelfRepository.save(existingEntity);
        log.info(
                "Deleted shelf {} and cascaded to {} subjects and {} test suites",
                id,
                subjects.size(),
                testSuites.size());
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "shelveServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID id) {
        log.info("Fetching shelve {} for user {}", id, this.currentUser().getId());
        ShelfEntity entity =
                shelfRepository
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
        Page<ShelfEntity> pageData = shelfRepository.findAllByUser(this.currentUser(), pageable);
        List<ShelfRes> entities = pageData.getContent().stream().map(this::toViewModel).toList();

        PagingRes<ShelfRes> response =
                new PagingRes<>(
                        entities,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    ShelfEntity toEntity(@NonNull ShelfReq from, ShelfEntity to) {
        if (to == null) {
            User currentUser = this.currentUser();
            return ShelfEntity.builder()
                    .icon(from.icon())
                    .name(from.name())
                    .description(from.description())
                    .user(currentUser)
                    .build();
        }

        to.setName(from.name());
        to.setDescription(from.description());
        to.setIcon(from.icon());
        return to;
    }

    ShelfRes toViewModel(ShelfEntity from) {
        if (from.getSubjects() == null || from.getSubjects().isEmpty()) {
            return new ShelfRes(
                    from.getId(),
                    from.getIcon(),
                    from.getName(),
                    from.getDescription(),
                    Collections.emptyList());
        }

        List<SubjectRes> subjects = getSubjects(from);
        return new ShelfRes(
                from.getId(), from.getIcon(), from.getName(), from.getDescription(), subjects);
    }

    User currentUser() {
        log.info("Retrieving current user info from UserService");
        return userService.getCurrentUser();
    }

    private List<SubjectRes> getSubjects(ShelfEntity from) {
        return from.getSubjects().stream()
                .map(
                        subject -> {
                            var stats = cardService.getShortPracticeStats(subject);
                            return new SubjectRes(
                                    subject.getId(),
                                    subject.getName(),
                                    subject.getDescription(),
                                    stats.getLeft(),
                                    stats.getRight(),
                                    subject.getDailyLimit(),
                                    subject.getNewCardsPerDay(),
                                    subject.getInterval());
                        })
                .toList();
    }

    /** FALLBACK METHODS */

    // Fallback method for create
    public ApiRes createFallback(ShelfReq request, Throwable t) {
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
        throw unwrapShelfException(t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID id, Throwable t) {
        log.error("Shelve service unavailable during delete: {}", t.getMessage());
        throw unwrapShelfException(t);
    }

    // Fallback method for update
    public ApiRes updateFallback(ShelfReq request, UUID id, Throwable t) {
        log.error("Shelve service unavailable during update: {}", t.getMessage());
        throw unwrapShelfException(t);
    }

    private RuntimeException unwrapShelfException(Throwable t) {
        if (t instanceof NotFoundException nfe) {
            return nfe;
        }
        if (t instanceof ValidationException ve) {
            return ve;
        }
        if (t instanceof UnauthenticatedException ue) {
            return ue;
        }
        return new RetryLaterException(
                "Shelve service is currently unavailable. Please try again later.", t);
    }
}
