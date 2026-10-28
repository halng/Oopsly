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

package com.app.oopsly.api.testsuite.application;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shared.util.AnswerMatcher;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.shared.util.StringUtils;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.testsuite.application.vm.QuestionBreakdown;
import com.app.oopsly.api.testsuite.application.vm.TestAttemptRes;
import com.app.oopsly.api.testsuite.application.vm.TestRunCardRes;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionReq;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionRes;
import com.app.oopsly.api.testsuite.application.vm.TestSuiteReq;
import com.app.oopsly.api.testsuite.application.vm.TestSuiteRes;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.QuestionMetadata;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.domain.SelectionMode;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.domain.TestSuiteSelectionPayload;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.TreeSet;
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

    static final String DEFAULT_SLUG = "test";
    private static final UUID NO_ID = new UUID(0L, 0L);

    private final TestSuiteRepository testSuiteRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final QuestionRepository questionRepository;
    private final QuestionMetadataMapper metadataMapper;
    private final CurrentUser currentUser;
    private final UserProgressService userProgressService;

    @Override
    @CacheEvict(value = "testSuites", key = "#deckId + ':all'")
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "createFallback")
    public ApiRes create(UUID deckId, TestSuiteReq request) {
        log.info("Creating test suite for shelve {}", deckId);
        Shelf shelve = this.findShelveByIdAndUser(deckId);

        TestSuiteEntity testSuite = this.toEntity(request, null);
        testSuite.setShelf(shelve);
        testSuite.setSlug(uniqueSlug(shelve, request.title(), null));
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
        Shelf shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity existingTestSuite = findSuite(testSuiteId, shelve);

        boolean titleChanged = !Objects.equals(existingTestSuite.getTitle(), request.title());
        TestSuiteEntity updatedTestSuite = this.toEntity(request, existingTestSuite);
        if (titleChanged
                || updatedTestSuite.getSlug() == null
                || updatedTestSuite.getSlug().isBlank()) {
            updatedTestSuite.setSlug(uniqueSlug(shelve, request.title(), testSuiteId));
        }
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
        Shelf shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity testSuite = findSuite(testSuiteId, shelve);

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
        Shelf shelve = this.findShelveByIdAndUser(deckId);
        TestSuiteEntity testSuite = findSuite(testSuiteId, shelve);

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
        Shelf shelve = this.findShelveByIdAndUser(shelveId);
        List<TestSuiteEntity> testSuites = testSuiteRepository.findAllByShelve(shelve);
        List<TestSuiteRes> responses = testSuites.stream().map(this::toViewModel).toList();

        return ApiRes.success("Test suites fetched successfully", responses);
    }

    @Override
    @Transactional
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "getAttemptFallback")
    public ApiRes getAttempt(UUID shelveId, UUID testSuiteId) {
        log.info("Starting attempt of test suite {} under shelve {}", testSuiteId, shelveId);
        Shelf shelve = this.findShelveByIdAndUser(shelveId);
        TestSuiteEntity suite = findSuite(testSuiteId, shelve);

        List<TestAttemptRes.Question> questions =
                questionRepository.findAllByTestSuite(suite).stream()
                        .map(
                                question -> {
                                    List<String> options =
                                            question.getType() == QuestionType.FILL_IN_THE_BLANK
                                                    ? List.of()
                                                    : metadataMapper
                                                            .read(question.getMetadata())
                                                            .optionsOrEmpty();
                                    return new TestAttemptRes.Question(
                                            question.getId(),
                                            question.getText(),
                                            question.getType(),
                                            options);
                                })
                        .toList();

        Integer timeLimitSeconds =
                suite.getTimeLimitMinutes() == null ? null : suite.getTimeLimitMinutes() * 60;
        return ApiRes.success(
                "Test attempt ready",
                new TestAttemptRes(suite.getId(), suite.getTitle(), timeLimitSeconds, questions));
    }

    @Override
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "runFallback")
    @Transactional
    public ApiRes run(UUID shelveId, UUID testSuiteId) {
        log.info("Running test preset {} under shelve {}", testSuiteId, shelveId);
        Shelf shelve = findShelveByIdAndUser(shelveId);
        TestSuiteEntity suite =
                testSuiteRepository
                        .findByIdAndShelveWithSubjects(testSuiteId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Test suite not found with id: " + testSuiteId));

        List<Subject> subjects = suite.getSubjects();
        if (subjects == null || subjects.isEmpty()) {
            return ApiRes.success(
                    "No subjects linked to this preset; add subjectIds when creating or updating.",
                    Collections.emptyList());
        }

        TestSuiteSelectionPayload effective = resolveSelection(suite);
        List<Card> pool =
                switch (effective.getMode()) {
                    case ALL -> cardRepository.findAllBySubjectInAndDeletedFalse(subjects);
                    case DUE_ONLY -> cardRepository.findDueBySubjects(subjects, Instant.now());
                    case RANDOM -> cardRepository.findAllBySubjectInAndDeletedFalse(subjects);
                };

        if (pool.isEmpty()) {
            return ApiRes.success("No cards match this preset.", Collections.emptyList());
        }

        ArrayList<Card> mutable = new ArrayList<>(pool);
        if (Boolean.TRUE.equals(effective.getShuffle())
                || effective.getMode() == SelectionMode.RANDOM) {
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

    @Override
    @Caching(
            evict = {
                @CacheEvict(value = "testSuites", key = "#shelveId + ':' + #testSuiteId"),
                @CacheEvict(value = "testSuites", key = "#shelveId + ':all'")
            })
    @CircuitBreaker(name = "testSuiteServiceCircuitBreaker", fallbackMethod = "submitFallback")
    @Transactional
    public ApiRes submit(UUID shelveId, UUID testSuiteId, TestSubmissionReq request) {
        log.info("Submitting test run {} under shelve {}", testSuiteId, shelveId);
        Shelf shelve = findShelveByIdAndUser(shelveId);
        TestSuiteEntity suite = findSuite(testSuiteId, shelve);

        List<QuestionEntity> questions = questionRepository.findAllByTestSuite(suite);
        if (questions.isEmpty()) {
            throw new ValidationException("This test suite has no questions yet");
        }

        List<QuestionBreakdown> breakdown = new ArrayList<>();
        int score = 0;
        for (QuestionEntity question : questions) {
            QuestionBreakdown graded = grade(question, request);
            if (graded.correct()) {
                score++;
            }
            breakdown.add(graded);
        }

        int totalQuestions = questions.size();
        int percentage = Math.round((score * 100.0f) / totalQuestions);
        int xpGained =
                score * GamificationRules.XP_PER_CORRECT_ANSWER
                        + GamificationRules.XP_TEST_COMPLETION_BONUS;

        if (suite.getHighestScore() == null || percentage > suite.getHighestScore()) {
            suite.setHighestScore(percentage);
            testSuiteRepository.save(suite);
        }
        Integer storedXp = userProgressService.updateUserProgress(xpGained).getTotalXp();
        int totalXp = storedXp == null ? xpGained : storedXp;

        log.info(
                "Test suite {} submitted with score {}/{} ({}%)",
                testSuiteId, score, totalQuestions, percentage);

        return ApiRes.success(
                ApiMessages.TEST_SUBMITTED,
                new TestSubmissionRes(
                        score,
                        totalQuestions,
                        percentage,
                        request.timeSpentSeconds() == null ? 0 : request.timeSpentSeconds(),
                        xpGained,
                        totalXp,
                        breakdown));
    }

    QuestionBreakdown grade(QuestionEntity question, TestSubmissionReq request) {
        QuestionMetadata metadata = metadataMapper.read(question.getMetadata());
        QuestionType type = question.getType();
        List<String> options = metadata.optionsOrEmpty();

        Integer userIndex = null;
        List<Integer> userIndexes = null;
        String userText = null;
        Integer correctIndex = null;
        List<Integer> correctIndexes = null;
        String correctText;
        boolean correct;

        if (type == QuestionType.MULTIPLE_CHOICE) {
            List<Integer> raw = valueFor(request.multiAnswers(), question.getId());
            userIndexes = raw == null ? List.of() : sortedDistinct(raw);
            correctIndexes = sortedDistinct(metadata.correctOptionIndexesOrEmpty());
            correct =
                    !correctIndexes.isEmpty()
                            && new HashSet<>(userIndexes).equals(new HashSet<>(correctIndexes));
            correctText = optionTexts(options, correctIndexes);
        } else if (type == QuestionType.FILL_IN_THE_BLANK) {
            userText = valueFor(request.textAnswers(), question.getId());
            List<String> accepted = metadata.acceptedAnswersOrEmpty();
            correct = AnswerMatcher.matches(userText, accepted, metadata.caseSensitiveOrFalse());
            correctText = String.join(" / ", accepted);
            options = List.of();
        } else if (type == QuestionType.SINGLE_CHOICE || type == QuestionType.TRUE_FALSE) {
            userIndex = valueFor(request.answers(), question.getId());
            correctIndex = metadata.correctOptionIndex();
            correct = userIndex != null && userIndex.equals(correctIndex);
            correctText = correctIndex == null ? null : optionTexts(options, List.of(correctIndex));
        } else {
            correct = false;
            correctText = null;
        }

        return new QuestionBreakdown(
                question.getId(),
                question.getText(),
                type,
                userIndex,
                userIndexes,
                userText,
                correctIndex,
                correctIndexes,
                correctText,
                options,
                correct,
                metadata.explanation());
    }

    private static <T> T valueFor(Map<UUID, T> answers, UUID questionId) {
        return answers == null ? null : answers.get(questionId);
    }

    private static List<Integer> sortedDistinct(List<Integer> values) {
        return new ArrayList<>(
                values.stream()
                        .filter(Objects::nonNull)
                        .collect(Collectors.toCollection(TreeSet::new)));
    }

    private static String optionTexts(List<String> options, List<Integer> indexes) {
        return indexes.stream()
                .filter(index -> index >= 0 && index < options.size())
                .map(options::get)
                .collect(Collectors.joining(", "));
    }

    String uniqueSlug(Shelf shelve, String title, UUID excludeId) {
        String base = StringUtils.slugify(title, DEFAULT_SLUG);
        Set<String> taken =
                new HashSet<>(
                        testSuiteRepository.findSlugsByShelfExcluding(
                                shelve, excludeId == null ? NO_ID : excludeId));
        if (!taken.contains(base)) {
            return base;
        }
        int suffix = 2;
        while (taken.contains(base + "-" + suffix)) {
            suffix++;
        }
        return base + "-" + suffix;
    }

    private static int computeCap(TestSuiteSelectionPayload effective, int poolSize) {
        if (effective.getMode() == SelectionMode.RANDOM) {
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
            return new TestSuiteSelectionPayload(SelectionMode.ALL, null, Boolean.FALSE);
        }
        SelectionMode mode = s.getMode() != null ? s.getMode() : SelectionMode.ALL;
        Boolean shuffle = s.getShuffle() != null ? s.getShuffle() : Boolean.FALSE;
        return new TestSuiteSelectionPayload(mode, s.getLimit(), shuffle);
    }

    TestSuiteEntity toEntity(@NonNull TestSuiteReq from, TestSuiteEntity to) {
        String description = blankToNull(from.description());
        if (to == null) {
            return TestSuiteEntity.builder()
                    .title(from.title().trim())
                    .description(description)
                    .timeLimitMinutes(from.timeLimitMinutes())
                    .isActive(from.isActive() != null ? from.isActive() : true)
                    .build();
        }

        to.setTitle(from.title().trim());
        to.setDescription(description);
        to.setTimeLimitMinutes(from.timeLimitMinutes());
        if (from.isActive() != null) {
            to.setIsActive(from.isActive());
        }
        return to;
    }

    TestSuiteRes toViewModel(TestSuiteEntity from) {
        return new TestSuiteRes(
                from.getId(),
                from.getTitle(),
                from.getSlug(),
                from.getDescription(),
                from.getTimeLimitMinutes(),
                from.getIsActive(),
                questionRepository.countByTestSuite(from),
                from.getHighestScore());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private TestSuiteEntity findSuite(UUID testSuiteId, Shelf shelve) {
        return testSuiteRepository
                .findByIdAndShelve(testSuiteId, shelve)
                .orElseThrow(
                        () ->
                                new NotFoundException(
                                        "Test suite not found with id: " + testSuiteId));
    }

    private Shelf findShelveByIdAndUser(UUID deckId) {
        return shelfRepository
                .findByIdAndUserId(deckId, currentUser.id())
                .orElseThrow(() -> new NotFoundException("Shelve not found with id: " + deckId));
    }

    @Override
    public ApiRes autoGenerate(UUID shelveId, UUID subjectId, int numQuestions) {
        log.info(
                "Auto-generating test suite for subject: {} under shelve: {} with {} questions",
                subjectId,
                shelveId,
                numQuestions);
        Shelf shelve = findShelveByIdAndUser(shelveId);
        Subject subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelve)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        String title = "Auto: " + subject.getName();
        TestSuiteEntity testSuite =
                TestSuiteEntity.builder()
                        .title(title)
                        .slug(uniqueSlug(shelve, title, null))
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
        log.error("Test suite service unavailable during create: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes updateFallback(UUID deckId, UUID testSuiteId, TestSuiteReq request, Throwable t) {
        log.error("Test suite service unavailable during update: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes deleteFallback(UUID deckId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during delete: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes getByIdFallback(UUID deckId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during getById: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes getAllByShelveFallback(UUID shelveId, Throwable t) {
        log.error("Test suite service unavailable during getAllByShelve: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes getAttemptFallback(UUID shelveId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during getAttempt: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes runFallback(UUID shelveId, UUID testSuiteId, Throwable t) {
        log.error("Test suite service unavailable during run: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    public ApiRes submitFallback(
            UUID shelveId, UUID testSuiteId, TestSubmissionReq request, Throwable t) {
        log.error("Test suite service unavailable during submit: {}", t.toString());
        throw unwrapTestSuiteException(t);
    }

    private RuntimeException unwrapTestSuiteException(Throwable t) {
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
                "Test suite service is currently unavailable. Please try again later.", t);
    }
}
