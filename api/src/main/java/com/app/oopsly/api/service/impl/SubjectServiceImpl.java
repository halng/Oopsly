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
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.util.StringUtils;
import com.app.oopsly.api.viewmodel.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubjectServiceImpl implements SubjectService {

    private final SubjectRepository subjectRepository;
    private final ShelfRepository shelfRepository;
    private final UserService userService;
    private final CardService cardService;
    private final CardRepository cardRepository;

    @Override
    @CircuitBreaker(name = "subjectServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID shelfId, SubjectReq request) {
        log.info("Creating subject for shelf: {}", shelfId);
        ShelfEntity shelf = getShelfForCurrentUser(shelfId);

        SubjectEntity subject =
                SubjectEntity.builder()
                        .name(request.name())
                        .description(request.description())
                        .shelf(shelf)
                        .build();

        SubjectEntity savedSubject = subjectRepository.save(subject);
        log.info("Successfully created subject: {}", savedSubject.getId());

        return ApiRes.created("Created successfully", toSubjectRes(savedSubject));
    }

    @Override
    @CircuitBreaker(name = "subjectServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(UUID shelfId, UUID subjectId, SubjectReq request) {
        log.info("Updating subject: {} in shelf: {}", subjectId, shelfId);

        if (request.name() == null || request.name().trim().isEmpty()) {
            throw new ValidationException("Subject name cannot be empty");
        }

        ShelfEntity shelf = getShelfForCurrentUser(shelfId);
        SubjectEntity existingSubject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        existingSubject.setName(request.name());
        existingSubject.setDescription(request.description());
        SubjectEntity updatedSubject = subjectRepository.save(existingSubject);

        log.info("Successfully updated subject: {}", subjectId);
        return ApiRes.success("Updated successfully", toSubjectRes(updatedSubject));
    }

    @Override
    public ApiRes updateSetting(UUID shelveId, UUID subjectId, SubjectSettingReq request) {
        log.info("Updating subject settings: {} in shelf: {}", subjectId, shelveId);

        var shelfId = getShelfForCurrentUser(shelveId);
        SubjectEntity existingSubject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelfId)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        log.debug(
                "Updating settings for subject: {}: dailyLimit={}, newCardsPerDay={}, interval={}",
                subjectId,
                request.dailyLimit(),
                request.newCardsPerDay(),
                request.interval());

        existingSubject.setDailyLimit(request.dailyLimit());
        existingSubject.setNewCardsPerDay(request.newCardsPerDay());
        existingSubject.setInterval(request.interval());

        subjectRepository.save(existingSubject);
        log.info("Successfully updated subject settings: {}", subjectId);
        return ApiRes.success("Updated successfully");
    }

    @Override
    @Transactional
    @CircuitBreaker(name = "subjectServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID shelfId, UUID subjectId) {
        log.info("Deleting subject: {} from shelf: {}", subjectId, shelfId);
        ShelfEntity shelf = getShelfForCurrentUser(shelfId);
        SubjectEntity existingSubject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        existingSubject.setDeleted(true);
        if (existingSubject.getCards() != null) {
            existingSubject.getCards().forEach(card -> card.setDeleted(true));
        }
        subjectRepository.save(existingSubject);

        log.info("Successfully deleted subject: {} and associated cards", subjectId);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    @CircuitBreaker(name = "subjectServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID shelfId, UUID subjectId) {
        log.info("Getting subject: {} from shelf: {}", subjectId, shelfId);
        ShelfEntity shelf = getShelfForCurrentUser(shelfId);
        SubjectEntity subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        log.info("Successfully retrieved subject: {}", subjectId);
        return ApiRes.success("Fetched successfully", toSubjectRes(subject));
    }

    @Override
    @CircuitBreaker(
            name = "subjectServiceCircuitBreaker",
            fallbackMethod = "getAllByShelveFallback")
    public ApiRes getAllByShelve(UUID shelfId, int page, int size) {
        log.info(
                "Getting all subjects for shelf: {} with page: {} and size: {}",
                shelfId,
                page,
                size);
        ShelfEntity shelf = getShelfForCurrentUser(shelfId);
        Pageable pageable = PageRequest.of(page, size);
        Page<SubjectEntity> pageData = subjectRepository.findAllByShelve(shelf, pageable);
        List<SubjectRes> subjects =
                pageData.getContent().stream().map(this::toSubjectRes).collect(Collectors.toList());

        PagingRes<SubjectRes> pagingRes =
                new PagingRes<>(
                        subjects,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());

        log.info(
                "Successfully retrieved {} subjects for shelf: {} (total: {})",
                subjects.size(),
                shelfId,
                pageData.getTotalElements());
        return ApiRes.success("Fetched successfully", pagingRes);
    }

    private SubjectRes toSubjectRes(SubjectEntity entity) {
        var stats = cardService.getShortPracticeStats(entity);
        return new SubjectRes(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                stats.getLeft(),
                stats.getRight(),
                entity.getDailyLimit(),
                entity.getNewCardsPerDay(),
                entity.getInterval());
    }

    @Override
    public ApiRes discoverPublicDecks(String query, int page, int size) {
        log.info(
                "Discovering public decks with query: '{}', page: {}, size: {}", query, page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<SubjectEntity> pageData =
                (query == null || query.isBlank())
                        ? subjectRepository.findAllPublic(pageable)
                        : subjectRepository.findPublicByQuery(query, pageable);

        List<SubjectRes> subjects =
                pageData.getContent().stream().map(this::toSubjectRes).collect(Collectors.toList());
        PagingRes<SubjectRes> pagingRes =
                new PagingRes<>(
                        subjects,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        return ApiRes.success("Public decks fetched successfully", pagingRes);
    }

    @Override
    @Transactional
    public ApiRes cloneDeck(UUID subjectId) {
        User currentUser = userService.getCurrentUser();
        log.info("Cloning public deck: {} for user: {}", subjectId, currentUser.getId());

        SubjectEntity source =
                subjectRepository
                        .findById(subjectId)
                        .filter(
                                s ->
                                        Boolean.TRUE.equals(s.getIsPublic())
                                                && !Boolean.TRUE.equals(s.getDeleted()))
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Public subject not found with id: " + subjectId));

        List<ShelfEntity> shelves =
                shelfRepository.findAllByUser(currentUser, PageRequest.of(0, 1)).getContent();
        if (shelves.isEmpty()) {
            return ApiRes.badRequest("No shelves found. Create a shelf first.");
        }
        ShelfEntity targetShelf = shelves.get(0);

        SubjectEntity cloned =
                SubjectEntity.builder()
                        .name(source.getName())
                        .description(source.getDescription())
                        .dailyLimit(source.getDailyLimit())
                        .newCardsPerDay(source.getNewCardsPerDay())
                        .interval(source.getInterval())
                        .isPublic(false)
                        .shelf(targetShelf)
                        .parentSubject(source)
                        .build();
        SubjectEntity savedClone = subjectRepository.save(cloned);

        if (source.getCards() != null) {
            List<CardEntity> clonedCards =
                    source.getCards().stream()
                            .filter(c -> !Boolean.TRUE.equals(c.getDeleted()))
                            .map(
                                    c ->
                                            CardEntity.builder()
                                                    .front(c.getFront())
                                                    .back(c.getBack())
                                                    .difficultyLevel(c.getDifficultyLevel())
                                                    .nextPracticeTime(Instant.now())
                                                    .subject(savedClone)
                                                    .build())
                            .collect(Collectors.toList());
            cardRepository.saveAll(clonedCards);
        }

        log.info("Successfully cloned deck: {} as: {}", subjectId, savedClone.getId());
        return ApiRes.created("Deck cloned successfully", toSubjectRes(savedClone));
    }

    private ShelfEntity getShelfForCurrentUser(UUID shelfId) {
        User currentUser = userService.getCurrentUser();
        log.debug(
                "Getting shelf: {} for user: {}",
                shelfId,
                StringUtils.masked(currentUser.getEmail()));
        return shelfRepository
                .findByIdAndUser(shelfId, currentUser)
                .orElseThrow(() -> new NotFoundException("Shelve not found with id: " + shelfId));
    }

    // Fallback methods for Circuit Breaker
    // Fallback method for getAllByShelve
    public ApiRes getAllByShelveFallback(UUID shelfId, int page, int size, Throwable t) {
        log.error("Subject service unavailable during getAllByShelve: {}", t.getMessage());
        throw unwrapSubjectException(t);
    }

    // Fallback method for getById
    public ApiRes getByIdFallback(UUID shelfId, UUID subjectId, Throwable t) {
        log.error("Subject service unavailable during getById: {}", t.getMessage());
        throw unwrapSubjectException(t);
    }

    // Fallback method for delete
    public ApiRes deleteFallback(UUID shelfId, UUID subjectId, Throwable t) {
        log.error("Subject service unavailable during delete: {}", t.getMessage());
        throw unwrapSubjectException(t);
    }

    // Fallback method for update
    public ApiRes updateFallback(UUID shelfId, UUID subjectId, SubjectReq request, Throwable t) {
        log.error("Subject service unavailable during update: {}", t.getMessage());
        throw unwrapSubjectException(t);
    }

    // Fallback method for create
    public ApiRes createFallback(UUID shelfId, SubjectReq request, Throwable t) {
        log.error("Subject service unavailable during create: {}", t.getMessage());
        throw unwrapSubjectException(t);
    }

    private RuntimeException unwrapSubjectException(Throwable t) {
        if (t instanceof ValidationException ve) {
            return ve;
        }
        if (t instanceof NotFoundException nfe) {
            return nfe;
        }
        if (t instanceof UnauthenticatedException ue) {
            return ue;
        }
        return new RetryLaterException(
                "Subject service is currently unavailable. Please try again later.", t);
    }
}
