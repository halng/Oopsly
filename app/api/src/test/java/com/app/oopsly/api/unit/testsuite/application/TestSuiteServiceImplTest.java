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

package com.app.oopsly.api.unit.testsuite.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.testsuite.application.QuestionMetadataMapper;
import com.app.oopsly.api.testsuite.application.TestSuiteServiceImpl;
import com.app.oopsly.api.testsuite.application.vm.TestSuiteReq;
import com.app.oopsly.api.testsuite.application.vm.TestSuiteRes;
import com.app.oopsly.api.testsuite.domain.SelectionMode;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.domain.TestSuiteSelectionPayload;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TestSuiteServiceImplTest {

    @Mock private TestSuiteRepository testSuiteRepository;

    @Mock private ShelfRepository shelfRepository;

    @Mock private SubjectRepository subjectRepository;

    @Mock private CurrentUser currentUser;

    @Mock private CardRepository cardRepository;

    @Mock private QuestionRepository questionRepository;

    @Mock private QuestionMetadataMapper metadataMapper;

    @InjectMocks private TestSuiteServiceImpl testSuiteService;

    private TestSuiteReq testSuiteReq;
    private UUID currentUserId;
    private Shelf shelve;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", null, null, true);
        currentUserId = UUID.randomUUID();
        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();

        shelve = new Shelf();
        shelve.setId(shelveId);
        shelve.setName("Test Shelve");
        shelve.setDescription("Test shelve description for testing purposes");
        shelve.setUserId(currentUserId);
    }

    @Test
    void create_savesNewTestSuite() {
        TestSuiteEntity savedTestSuite = new TestSuiteEntity();
        savedTestSuite.setId(testSuiteId);
        savedTestSuite.setTitle(testSuiteReq.title());
        savedTestSuite.setIsActive(testSuiteReq.isActive());
        savedTestSuite.setShelf(shelve);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, testSuiteReq);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> testSuiteService.create(shelveId, testSuiteReq));
        verify(testSuiteRepository, never()).save(any(TestSuiteEntity.class));
    }

    @Test
    void update_updatesExistingTestSuite() {
        TestSuiteEntity existingTestSuite = new TestSuiteEntity();
        existingTestSuite.setId(testSuiteId);
        existingTestSuite.setTitle("Old Title");
        existingTestSuite.setIsActive(false);
        existingTestSuite.setShelf(shelve);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(existingTestSuite));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(existingTestSuite);

        ApiRes result = testSuiteService.update(shelveId, testSuiteId, testSuiteReq);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void update_throwsNotFoundException_whenTestSuiteNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> testSuiteService.update(shelveId, testSuiteId, testSuiteReq));
        verify(testSuiteRepository, never()).save(any(TestSuiteEntity.class));
    }

    @Test
    void delete_softDeletesTestSuite() {
        TestSuiteEntity existingTestSuite = new TestSuiteEntity();
        existingTestSuite.setId(testSuiteId);
        existingTestSuite.setDeleted(false);
        existingTestSuite.setShelf(shelve);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(existingTestSuite));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(existingTestSuite);

        ApiRes result = testSuiteService.delete(shelveId, testSuiteId);

        assertNotNull(result);
        assertTrue(existingTestSuite.getDeleted());
        verify(testSuiteRepository, times(1)).save(existingTestSuite);
    }

    @Test
    void delete_throwsNotFoundException_whenTestSuiteNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> testSuiteService.delete(shelveId, testSuiteId));
    }

    @Test
    void getById_returnsTestSuite() {
        TestSuiteEntity testSuite = new TestSuiteEntity();
        testSuite.setId(testSuiteId);
        testSuite.setTitle(testSuiteReq.title());
        testSuite.setIsActive(testSuiteReq.isActive());
        testSuite.setShelf(shelve);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(testSuite));

        ApiRes result = testSuiteService.getById(shelveId, testSuiteId);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).findByIdAndShelve(testSuiteId, shelve);
    }

    @Test
    void getById_throwsNotFoundException_whenTestSuiteNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> testSuiteService.getById(shelveId, testSuiteId));
    }

    @Test
    void getAllByShelve_returnsAllTestSuites() {
        List<TestSuiteEntity> testSuites = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            TestSuiteEntity testSuite = new TestSuiteEntity();
            testSuite.setId(UUID.randomUUID());
            testSuite.setTitle("Test Suite " + i);
            testSuite.setIsActive(true);
            testSuite.setShelf(shelve);
            testSuites.add(testSuite);
        }

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findAllByShelve(shelve)).thenReturn(testSuites);

        ApiRes result = testSuiteService.getAllByShelve(shelveId);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).findAllByShelve(shelve);
    }

    @Test
    void create_withNullIsActive_defaultsToTrue() {
        TestSuiteReq reqWithNullIsActive = new TestSuiteReq("New Test Suite", null, null, null);
        TestSuiteEntity savedTestSuite = new TestSuiteEntity();
        savedTestSuite.setId(testSuiteId);
        savedTestSuite.setTitle(reqWithNullIsActive.title());
        savedTestSuite.setIsActive(true);
        savedTestSuite.setShelf(shelve);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, reqWithNullIsActive);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void testCreateFallback() {
        UUID shelveId = UUID.randomUUID();
        TestSuiteReq request = new TestSuiteReq("Test Suite", null, null, true);
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> testSuiteService.createFallback(shelveId, request, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testUpdateFallback() {
        UUID shelveId = UUID.randomUUID();
        UUID testSuiteId = UUID.randomUUID();
        TestSuiteReq request = new TestSuiteReq("Updated Suite", null, null, true);
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () ->
                                testSuiteService.updateFallback(
                                        shelveId, testSuiteId, request, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testDeleteFallback() {
        UUID shelveId = UUID.randomUUID();
        UUID testSuiteId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> testSuiteService.deleteFallback(shelveId, testSuiteId, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testGetByIdFallback() {
        UUID shelveId = UUID.randomUUID();
        UUID testSuiteId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> testSuiteService.getByIdFallback(shelveId, testSuiteId, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void testGetAllByDeckFallback() {
        UUID shelveId = UUID.randomUUID();
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> testSuiteService.getAllByShelveFallback(shelveId, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void run_returnsEmpty_whenNoSubjectsLinked() {
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(new ArrayList<>());

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);

        assertNotNull(result);
        verify(cardRepository, never()).findAllBySubjectInAndDeletedFalse(any());
    }

    @Test
    void run_loadsCards_forAllMode() {
        UUID subjectId = UUID.randomUUID();
        Subject subject = new Subject();
        subject.setId(subjectId);

        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(null);

        Card card = Card.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of(card));

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);

        assertNotNull(result);
        verify(cardRepository, times(1)).findAllBySubjectInAndDeletedFalse(List.of(subject));
    }

    @Test
    void testRunFallback() {
        RuntimeException exception = new RuntimeException("Database connection failed");

        RetryLaterException thrown =
                assertThrows(
                        RetryLaterException.class,
                        () -> testSuiteService.runFallback(shelveId, testSuiteId, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void run_dueOnlyMode_usesDueQuery() {
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.DUE_ONLY, 2, true));

        Card card = Card.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findDueBySubjects(eq(List.of(subject)), any()))
                .thenReturn(List.of(card));

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);

        assertTrue(result.getBody().isSuccess());
        verify(cardRepository).findDueBySubjects(eq(List.of(subject)), any());
    }

    @Test
    void run_randomMode_emptyPool_returnsEmptyMessage() {
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.RANDOM, null, false));

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of());

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);

        assertTrue(result.getBody().message().contains("No cards match"));
    }

    @Test
    void run_randomMode_capsResults() {
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.RANDOM, 1, null));

        List<Card> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Card card = Card.builder().front("Q" + i).back("A").numberOfPractice(0).build();
            card.setId(UUID.randomUUID());
            card.setSubject(subject);
            cards.add(card);
        }

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject))).thenReturn(cards);

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);

        assertEquals(1, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void autoGenerate_createsSuiteForSubject() {
        UUID subjectId = UUID.randomUUID();
        Subject subject = new Subject();
        subject.setId(subjectId);
        subject.setName("Biology");

        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(
                        inv -> {
                            TestSuiteEntity t = inv.getArgument(0);
                            t.setId(UUID.randomUUID());
                            return t;
                        });

        ApiRes result = testSuiteService.autoGenerate(shelveId, subjectId, 5);

        assertEquals(201, result.getStatusCode().value());
        verify(testSuiteRepository).save(any(TestSuiteEntity.class));
    }

    @Test
    void create_generatesSlugFromTitle_andMapsNewFields() {
        TestSuiteReq req = new TestSuiteReq("  Chương 1: Cell Biology! ", "  intro ", 15, null);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findSlugsByShelfExcluding(eq(shelve), any()))
                .thenReturn(List.of());
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(
                        inv -> {
                            TestSuiteEntity t = inv.getArgument(0);
                            t.setId(UUID.randomUUID());
                            return t;
                        });
        when(questionRepository.countByTestSuite(any())).thenReturn(4L);

        ApiRes result = testSuiteService.create(shelveId, req);

        TestSuiteRes res = (TestSuiteRes) result.getBody().data();
        assertEquals("chuong-1-cell-biology", res.slug());
        assertEquals("Chương 1: Cell Biology!", res.title());
        assertEquals("intro", res.description());
        assertEquals(15, res.timeLimitMinutes());
        assertTrue(res.isActive());
        assertEquals(4L, res.questionCount());
    }

    @Test
    void create_suffixesSlug_whenTaken() {
        TestSuiteReq req = new TestSuiteReq("Final", null, null, true);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findSlugsByShelfExcluding(eq(shelve), any()))
                .thenReturn(List.of("final", "final-2"));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes result = testSuiteService.create(shelveId, req);

        assertEquals("final-3", ((TestSuiteRes) result.getBody().data()).slug());
    }

    @Test
    void create_usesFallbackSlug_whenTitleHasNoLetters() {
        TestSuiteReq req = new TestSuiteReq("???", null, null, true);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes result = testSuiteService.create(shelveId, req);

        assertEquals("test", ((TestSuiteRes) result.getBody().data()).slug());
    }

    @Test
    void update_keepsSlug_whenTitleUnchanged() {
        TestSuiteEntity existing = new TestSuiteEntity();
        existing.setId(testSuiteId);
        existing.setTitle("Chapter 1 Review");
        existing.setSlug("chapter-1-review");
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(existing));

        testSuiteService.update(
                shelveId, testSuiteId, new TestSuiteReq("Chapter 1 Review", "", 30, false));

        assertEquals("chapter-1-review", existing.getSlug());
        assertNull(existing.getDescription());
        assertEquals(30, existing.getTimeLimitMinutes());
        assertFalse(existing.getIsActive());
        verify(testSuiteRepository, never()).findSlugsByShelfExcluding(any(), any());
    }

    @Test
    void update_regeneratesSlug_excludingItself_whenTitleChanges() {
        TestSuiteEntity existing = new TestSuiteEntity();
        existing.setId(testSuiteId);
        existing.setTitle("Old");
        existing.setSlug("old");
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(existing));
        when(testSuiteRepository.findSlugsByShelfExcluding(shelve, testSuiteId))
                .thenReturn(List.of("new"));

        testSuiteService.update(shelveId, testSuiteId, new TestSuiteReq("New", null, null, null));

        assertEquals("new-2", existing.getSlug());
    }

    @Test
    void getAttemptAndSubmitFallbacks_rethrowValidation() {
        ValidationException ve = new ValidationException("bad");
        assertThrows(
                ValidationException.class,
                () -> testSuiteService.getAttemptFallback(shelveId, testSuiteId, ve));
        assertThrows(
                RetryLaterException.class,
                () ->
                        testSuiteService.getAttemptFallback(
                                shelveId, testSuiteId, new RuntimeException("x")));
    }

    @Test
    void createFallback_rethrowsNotFoundAndUnauthenticated() {
        NotFoundException nfe = new NotFoundException("missing");
        assertThrows(
                NotFoundException.class,
                () -> testSuiteService.createFallback(shelveId, testSuiteReq, nfe));
        UnauthenticatedException ue = new UnauthenticatedException("auth");
        assertThrows(
                UnauthenticatedException.class,
                () -> testSuiteService.createFallback(shelveId, testSuiteReq, ue));
    }

    @Test
    void run_withExplicitLimitOnAllMode_caps() {
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(SelectionMode.ALL, 1, false));

        List<Card> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Card card = Card.builder().front("Q" + i).back("A").numberOfPractice(0).build();
            card.setId(UUID.randomUUID());
            card.setSubject(subject);
            cards.add(card);
        }
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject))).thenReturn(cards);

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);
        assertEquals(1, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void run_withPartialSelectionDefaults() {
        Subject subject = new Subject();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        TestSuiteSelectionPayload partial = new TestSuiteSelectionPayload(null, null, null);
        suite.setSelection(partial);

        Card card = Card.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of(card));

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);
        assertTrue(result.getBody().isSuccess());
    }
}
