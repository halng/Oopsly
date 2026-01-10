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
import com.app.oopsly.api.entity.TestSuite;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
import com.app.oopsly.api.service.TestSuiteService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
import com.app.oopsly.api.viewmodel.TestSuiteRes;
import java.util.List;
import java.util.UUID;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TestSuiteServiceImpl implements TestSuiteService {

    private final TestSuiteRepository testSuiteRepository;
    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    public ApiRes create(UUID deckId, TestSuiteReq request) {
        log.info("Creating test suite for deck {}", deckId);
        DeckEntity deck = this.findDeckByIdAndUser(deckId);

        TestSuite testSuite = this.toEntity(request, null);
        testSuite.setDeck(deck);
        TestSuite savedEntity = testSuiteRepository.save(testSuite);

        return ApiRes.created("Test suite created successfully", this.toViewModel(savedEntity));
    }

    @Override
    public ApiRes update(UUID deckId, UUID testSuiteId, TestSuiteReq request) {
        log.info("Updating test suite {} for deck {}", testSuiteId, deckId);
        DeckEntity deck = this.findDeckByIdAndUser(deckId);
        TestSuite existingTestSuite =
                testSuiteRepository
                        .findByIdAndDeck(testSuiteId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        TestSuite updatedTestSuite = this.toEntity(request, existingTestSuite);
        testSuiteRepository.save(updatedTestSuite);

        return ApiRes.success("Test suite updated successfully");
    }

    @Override
    public ApiRes delete(UUID deckId, UUID testSuiteId) {
        log.info("Deleting test suite {} for deck {}", testSuiteId, deckId);
        DeckEntity deck = this.findDeckByIdAndUser(deckId);
        TestSuite testSuite =
                testSuiteRepository
                        .findByIdAndDeck(testSuiteId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        testSuite.setDeleted(true);
        testSuiteRepository.save(testSuite);

        return ApiRes.success("Test suite deleted successfully");
    }

    @Override
    public ApiRes getById(UUID deckId, UUID testSuiteId) {
        log.info("Fetching test suite {} for deck {}", testSuiteId, deckId);
        DeckEntity deck = this.findDeckByIdAndUser(deckId);
        TestSuite testSuite =
                testSuiteRepository
                        .findByIdAndDeck(testSuiteId, deck)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        return ApiRes.success("Test suite fetched successfully", this.toViewModel(testSuite));
    }

    @Override
    public ApiRes getAllByDeck(UUID deckId) {
        log.info("Fetching all test suites for deck {}", deckId);
        DeckEntity deck = this.findDeckByIdAndUser(deckId);
        List<TestSuite> testSuites = testSuiteRepository.findAllByDeck(deck);
        List<TestSuiteRes> responses = testSuites.stream().map(this::toViewModel).toList();

        return ApiRes.success("Test suites fetched successfully", responses);
    }

    TestSuite toEntity(@NonNull TestSuiteReq from, TestSuite to) {
        if (to == null) {
            return TestSuite.builder()
                    .title(from.title())
                    .isActive(from.isActive() != null ? from.isActive() : true)
                    .build();
        }

        to.setTitle(from.title());
        if (from.isActive() != null) {
            to.setIsActive(from.isActive());
        }
        return to;
    }

    TestSuiteRes toViewModel(TestSuite from) {
        return new TestSuiteRes(from.getId(), from.getTitle(), from.getIsActive());
    }

    private DeckEntity findDeckByIdAndUser(UUID deckId) {
        User currentUser = userService.getCurrentUser();
        return deckRepository
                .findByIdAndUser(deckId, currentUser)
                .orElseThrow(() -> new NotFoundException("Deck not found with id: " + deckId));
    }
}
