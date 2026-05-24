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
import com.app.oopsly.api.entity.TestSuiteSelectionPayload;
import com.app.oopsly.api.entity.TestSuiteSelectionPayload.Mode;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.TestSuiteService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestRunCardRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
import com.app.oopsly.api.viewmodel.TestSuiteRes;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TestSuiteServiceImpl implements TestSuiteService {

    private final TestSuiteRepository testSuiteRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final UserService userService;

    @Override
    @CacheEvict(value = "testSuites", key = "#deckId + ':all'")
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID deckId, TestSuiteReq request) {
        log.info("Creating test suite for shelve {}", deckId);
        ShelfEntity shelve = this.findShelveByIdAndUser(deckId);

        TestSuiteEntity testSuite = this.toEntity(request, null);
        testSuite.setShelf(shelve);
        applySubjectLinks(shelve, request, testSuite);
        TestSuiteEntity savedEntity = testSuiteRepository.save(testSuite);

        return ApiRes.created("Test suite created successfully", this.toViewModel(savedEntity));
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "testSuites", key = "#deckId + ':' + #testSuiteId"),
                @CacheEvict(value = "testSuites", key = "#deckId + ':all'")
            })
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "updateFallback")
    public ApiRes update(UUID deckId, UUID testSuiteId, TestSuiteReq request) {
        log.info("Updating test suite {} for shelve {}", testSuiteId, deckId);
        ShelfEntity shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity existingTestSuite =
                testSuiteRepository
                        .findByIdAndShelve(testSuiteId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        TestSuiteEntity updatedTestSuite = this.toEntity(request, existingTestSuite);
        applySubjectLinks(shelve, request, updatedTestSuite);
        testSuiteRepository.save(updatedTestSuite);

        return ApiRes.success(
                "Test suite updated successfully", this.toViewModel(updatedTestSuite));
    }

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "testSuites", key = "#deckId + ':' + #testSuiteId"),
                @CacheEvict(value = "testSuites", key = "#deckId + ':all'")
            })
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "deleteFallback")
    public ApiRes delete(UUID deckId, UUID testSuiteId) {
        log.info("Deleting test suite {} for shelve {}", testSuiteId, deckId);
        ShelfEntity shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity testSuite =
                testSuiteRepository
                        .findByIdAndShelve(testSuiteId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        testSuite.setDeleted(true);
        testSuiteRepository.save(testSuite);

        return ApiRes.success("Test suite deleted successfully");
    }

    @Override
    @Transactional
    @Cacheable(value = "testSuites", key = "#deckId + ':' + #testSuiteId")
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "getByIdFallback")
    public ApiRes getById(UUID deckId, UUID testSuiteId) {
        log.info("Fetching test suite {} for shelve {}", testSuiteId, deckId);
        ShelfEntity shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity testSuite =
                testSuiteRepository
                        .findByIdAndShelve(testSuiteId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        return ApiRes.success("Test suite fetched successfully", this.toViewModel(testSuite));
    }

    @Override
    @Transactional
    @Cacheable(value = "testSuites", key = "#shelveId + ':all'")
    @CircuitBreaker(
            name = "testSuiteServiceCircuitBreaker",
            fallbackMethod = "getAllByShelveFallback")
    public ApiRes getAllByShelve(UUID shelveId) {
        log.info("Fetching all test suites for shelve {}", shelveId);
        ShelfEntity shelve = this.findShelveByIdAndUser(shelveId);
        List<TestSuiteEntity> testSuites = testSuiteRepository.findAllByShelve(shelve);
        List<TestSuiteRes> responses = testSuites.stream().map(this::toViewModel).toList();

        return ApiRes.success("Test suites fetched successfully", responses);
    }

    @Override
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "runFallback")
    @Transactional
    public ApiRes run(UUID shelveId, UUID testSuiteId) {
        log.info("Running test preset {} under shelve {}", testSuiteId, shelveId);
        ShelfEntity shelve = findShelveByIdAndUser(shelveId);
        TestSuiteEntity suite =
                testSuiteRepository
                        .findByIdAndShelveWithSubjects(testSuiteId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        List<SubjectEntity> subjects = suite.getSubjects();
        if (subjects == null || subjects.isEmpty()) {
            return ApiRes.success(
                    "No subjects linked to this preset; add subjectIds when creating or updating.",
                    Collections.emptyList());
        }

        TestSuiteSelectionPayload effective = resolveSelection(suite);
        List<CardEntity> pool =
                switch (effective.getMode()) {
                    case ALL -> cardRepository.findAllBySubjectInAndDeletedFalse(subjects);
                    case DUE_ONLY -> cardRepository.findDueBySubjects(subjects, Instant.now());
                    case RANDOM -> cardRepository.findAllBySubjectInAndDeletedFalse(subjects);
                };

        if (pool.isEmpty()) {
            return ApiRes.success("No cards match this preset.", Collections.emptyList());
        }

        ArrayList<CardEntity> mutable = new ArrayList<>(pool);
        if (Boolean.TRUE.equals(effective.getShuffle()) || effective.getMode() == Mode.RANDOM) {
            Collections.shuffle(mutable, new Random());
        }

        int cap = computeCap(effective, mutable.size());
        if (mutable.size() > cap) {
            mutable = new ArrayList<>(mutable.subList(0, cap));
        }

        List<TestRunCardRes> dto =
                mutable.stream()
                        .map(
                                c ->
                                        new TestRunCardRes(
                                                c.getId(),
                                                c.getSubject().getId(),
                                                c.getFront(),
                                                c.getBack(),
                                                c.getDifficultyLevel(),
                                                c.getNextPracticeTime(),
                                                c.getNumberOfPractice()))
                        .collect(Collectors.toList());

        return ApiRes.success("Cards resolved for preset run", dto);
    }

    private static int computeCap(TestSuiteSelectionPayload effective, int poolSize) {
        if (effective.getMode() == Mode.RANDOM) {
            int lim =
                    effective.getLimit() != null
                            ? effective.getLimit()
                            : TestSuiteSelectionPayload.RANDOM_DEFAULT_LIMIT;
            return Math.min(poolSize, Math.max(1, lim));
        }
        if (effective.getLimit() != null) {
            return Math.min(poolSize, Math.max(1, effective.getLimit()));
        }
        return Math.min(poolSize, TestSuiteSelectionPayload.DEFAULT_MAX_WITHOUT_EXPLICIT_LIMIT);
    }

    private static TestSuiteSelectionPayload resolveSelection(TestSuiteEntity suite) {
        TestSuiteSelectionPayload s = suite.getSelection();
        if (s == null) {
            return new TestSuiteSelectionPayload(Mode.ALL, null, Boolean.FALSE);
        }
        Mode mode = s.getMode() != null ? s.getMode() : Mode.ALL;
        Boolean shuffle = s.getShuffle() != null ? s.getShuffle() : Boolean.FALSE;
        return new TestSuiteSelectionPayload(mode, s.getLimit(), shuffle);
    }

    void applySubjectLinks(ShelfEntity shelve, TestSuiteReq request, TestSuiteEntity entity) {
        if (request.subjectIds() == null) {
            return;
        }
        if (request.subjectIds().isEmpty()) {
            entity.setSubjects(new ArrayList<>());
            return;
        }
        List<SubjectEntity> subjects =
                request.subjectIds().stream()
                        .map(
                                subjectId ->
                                        subjectRepository
                                                .findByIdAndShelve(subjectId, shelve)
                                                .orElseThrow(
                                                        () ->
                                                                new NotFoundException(
                                                                        "Subject not found: "
                                                                                + subjectId)))
                        .collect(Collectors.toList());
        entity.setSubjects(subjects);
    }

    TestSuiteEntity toEntity(@NonNull TestSuiteReq from, TestSuiteEntity to) {
        if (to == null) {
            return TestSuiteEntity.builder()
                    .title(from.title())
                    .isActive(from.isActive() != null ? from.isActive() : true)
                    .selection(from.selection())
                    .build();
        }

        to.setTitle(from.title());
        if (from.isActive() != null) {
            to.setIsActive(from.isActive());
        }
        if (from.selection() != null) {
            to.setSelection(from.selection());
        }
        return to;
    }

    TestSuiteRes toViewModel(TestSuiteEntity from) {
        List<UUID> subjectIds =
                from.getSubjects() == null
                        ? List.of()
                        : from.getSubjects().stream().map(SubjectEntity::getId).toList();
        return new TestSuiteRes(
                from.getId(), from.getTitle(), from.getIsActive(), subjectIds, from.getSelection());
    }

    private ShelfEntity findShelveByIdAndUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        return shelfRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Shelve not found with id: " + deckId));
    }

    @Override
    public ApiRes autoGenerate(UUID shelveId, UUID subjectId, int numQuestions) {
        log.info(
                "Auto-generating test suite for subject: {} under shelve: {} with {} questions",
                subjectId,
                shelveId,
                numQuestions);
        ShelfEntity shelve = findShelveByIdAndUser(shelveId);
        SubjectEntity subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        TestSuiteEntity testSuite =
                TestSuiteEntity.builder()
                        .title("Auto: " + subject.getName())
                        .isActive(true)
                        .shelf(shelve)
                        .build();
        testSuite.setSubjects(List.of(subject));
        TestSuiteEntity saved = testSuiteRepository.save(testSuite);

        log.info("Auto-generated test suite: {} for subject: {}", saved.getId(), subjectId);
        return ApiRes.created("Test suite auto-generated successfully", this.toViewModel(saved));
    }

    // Fallback methods for Circuit Breaker
    public ApiRes createFallback(UUID deckId, TestSuiteReq request, Throwable t) {
        log.error("Test suite service unavailable during create: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes updateFallback(UUID deckId, UUID testSuiteId, TestSuiteReq request, Throwable t) {
        log.error("Test suite service unavailable during update: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes deleteFallback(UUID deckId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during delete: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes getByIdFallback(UUID deckId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during getById: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes getAllByShelveFallback(UUID shelveId, Throwable t) {
        log.error("Test suite service unavailable during getAllByShelve: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes runFallback(UUID shelveId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during run: {}", t.getMessage());
        throw unwrapTestSuiteException(t);
    }

    private RuntimeException unwrapTestSuiteException(Throwable t) {
        if (t instanceof NotFoundException nfe) {
            return nfe;
        }
        if (t instanceof UnauthenticatedException ue) {
            return ue;
        }
        return new RetryLaterException(
                "Test suite service is currently unavailable. Please try again later.", t);
    }
}
