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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.service.impl.TestSuiteServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
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

    @Mock private UserService userService;

    @Mock private CardRepository cardRepository;

    @InjectMocks private TestSuiteServiceImpl testSuiteService;

    private TestSuiteReq testSuiteReq;
    private User currentUser;
    private ShelfEntity shelve;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", true, null, null);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();

        shelve = new ShelfEntity();
        shelve.setId(shelveId);
        shelve.setName("Test Shelve");
        shelve.setDescription("Test shelve description for testing purposes");
        shelve.setUser(currentUser);
    }

    @Test
    void create_savesNewTestSuite() {
        TestSuiteEntity savedTestSuite = new TestSuiteEntity();
        savedTestSuite.setId(testSuiteId);
        savedTestSuite.setTitle(testSuiteReq.title());
        savedTestSuite.setIsActive(testSuiteReq.isActive());
        savedTestSuite.setShelf(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, testSuiteReq);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(testSuite));

        ApiRes result = testSuiteService.getById(shelveId, testSuiteId);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).findByIdAndShelve(testSuiteId, shelve);
    }

    @Test
    void getById_throwsNotFoundException_whenTestSuiteNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, reqWithNullIsActive);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void testCreateFallback() {
        UUID shelveId = UUID.randomUUID();
        TestSuiteReq request = new TestSuiteReq("Test Suite", true, null, null);
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
        TestSuiteReq request = new TestSuiteReq("Updated Suite", true, null, null);
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

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(subjectId);

        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(null);

        CardEntity card = CardEntity.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(Mode.DUE_ONLY, 2, true));

        CardEntity card = CardEntity.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(Mode.RANDOM, null, false));

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(Mode.RANDOM, 1, null));

        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card =
                    CardEntity.builder().front("Q" + i).back("A").numberOfPractice(0).build();
            card.setId(UUID.randomUUID());
            card.setSubject(subject);
            cards.add(card);
        }

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setName("Biology");

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
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
    void create_withEmptySubjectIds_clearsSubjects() {
        TestSuiteReq req = new TestSuiteReq("t", true, List.of(), null);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(
                        inv -> {
                            TestSuiteEntity t = inv.getArgument(0);
                            t.setId(UUID.randomUUID());
                            assertNotNull(t.getSubjects());
                            assertTrue(t.getSubjects().isEmpty());
                            return t;
                        });

        ApiRes result = testSuiteService.create(shelveId, req);

        assertEquals(201, result.getStatusCode().value());
    }

    @Test
    void create_withSubjectIds_linksSubjects() {
        UUID subjectId = UUID.randomUUID();
        SubjectEntity subject = new SubjectEntity();
        subject.setId(subjectId);
        TestSuiteReq req = new TestSuiteReq("t", true, List.of(subjectId), null);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(subjectRepository.findByIdAndShelve(subjectId, shelve))
                .thenReturn(Optional.of(subject));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(
                        inv -> {
                            TestSuiteEntity t = inv.getArgument(0);
                            t.setId(UUID.randomUUID());
                            assertEquals(1, t.getSubjects().size());
                            return t;
                        });

        ApiRes result = testSuiteService.create(shelveId, req);

        assertEquals(201, result.getStatusCode().value());
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
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        suite.setSelection(new TestSuiteSelectionPayload(Mode.ALL, 1, false));

        List<CardEntity> cards = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            CardEntity card =
                    CardEntity.builder().front("Q" + i).back("A").numberOfPractice(0).build();
            card.setId(UUID.randomUUID());
            card.setSubject(subject);
            cards.add(card);
        }
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject))).thenReturn(cards);

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);
        assertEquals(1, ((List<?>) result.getBody().data()).size());
    }

    @Test
    void run_withPartialSelectionDefaults() {
        SubjectEntity subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setSubjects(List.of(subject));
        TestSuiteSelectionPayload partial = new TestSuiteSelectionPayload(null, null, null);
        suite.setSelection(partial);

        CardEntity card = CardEntity.builder().front("Q").back("A").numberOfPractice(0).build();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelveId, currentUser))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelveWithSubjects(testSuiteId, shelve))
                .thenReturn(Optional.of(suite));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of(card));

        ApiRes result = testSuiteService.run(shelveId, testSuiteId);
        assertTrue(result.getBody().isSuccess());
    }
}
