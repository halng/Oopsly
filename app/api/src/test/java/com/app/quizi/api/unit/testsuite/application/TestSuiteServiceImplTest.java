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

package com.app.quizi.api.unit.testsuite.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.quizi.api.shared.application.vm.ApiRes;
import com.app.quizi.api.shared.application.vm.PagingRes;
import com.app.quizi.api.shared.exception.NotFoundException;
import com.app.quizi.api.shared.exception.RetryLaterException;
import com.app.quizi.api.shared.exception.UnauthenticatedException;
import com.app.quizi.api.shared.exception.ValidationException;
import com.app.quizi.api.shared.plan.PlanLimitService;
import com.app.quizi.api.shared.security.CurrentUser;
import com.app.quizi.api.shelf.Shelf;
import com.app.quizi.api.shelf.ShelfRepository;
import com.app.quizi.api.testsuite.application.QuestionMetadataMapper;
import com.app.quizi.api.testsuite.application.TestSuiteServiceImpl;
import com.app.quizi.api.testsuite.application.vm.TestSuiteReq;
import com.app.quizi.api.testsuite.application.vm.TestSuiteRes;
import com.app.quizi.api.testsuite.domain.QuestionEntity;
import com.app.quizi.api.testsuite.domain.QuestionType;
import com.app.quizi.api.testsuite.domain.TestSuiteEntity;
import com.app.quizi.api.testsuite.infrastructure.QuestionRepository;
import com.app.quizi.api.testsuite.infrastructure.TestSuiteRepository;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class TestSuiteServiceImplTest {

    @Mock private TestSuiteRepository testSuiteRepository;

    @Mock private ShelfRepository shelfRepository;

    @Mock private CurrentUser currentUser;

    @Mock private QuestionRepository questionRepository;

    @Mock private QuestionMetadataMapper metadataMapper;

    @Mock private PlanLimitService planLimits;

    @InjectMocks private TestSuiteServiceImpl testSuiteService;

    private TestSuiteReq testSuiteReq;
    private UUID currentUserId;
    private Shelf shelve;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", null, null, true, null);
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
    @SuppressWarnings("unchecked")
    void getAllByShelve_returnsOnePageOfTestSuites() {
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
        when(testSuiteRepository.findAllByShelve(eq(shelve), any(Pageable.class)))
                .thenReturn(new PageImpl<>(testSuites, PageRequest.of(1, 3), 8));

        ApiRes result = testSuiteService.getAllByShelve(shelveId, 2, 3);

        org.mockito.ArgumentCaptor<Pageable> asked =
                org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(testSuiteRepository, times(1)).findAllByShelve(eq(shelve), asked.capture());
        // The API counts pages from 1, the repository from 0.
        assertEquals(1, asked.getValue().getPageNumber());
        assertEquals(3, asked.getValue().getPageSize());
        PagingRes<TestSuiteRes> body = (PagingRes<TestSuiteRes>) result.getBody().data();
        assertEquals(3, body.entities().size());
        assertEquals(8, body.totalItems());
        assertEquals(3, body.totalPages());
        assertTrue(body.hasNextPage());
    }

    @Test
    void getAllByShelve_rejectsPageZero() {
        assertThrows(
                ValidationException.class, () -> testSuiteService.getAllByShelve(shelveId, 0, 10));
        verify(testSuiteRepository, never()).findAllByShelve(any(), any(Pageable.class));
    }

    @Test
    void create_withNullIsActive_defaultsToTrue() {
        TestSuiteReq reqWithNullIsActive =
                new TestSuiteReq("New Test Suite", null, null, null, null);
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
        TestSuiteReq request = new TestSuiteReq("Test Suite", null, null, true, null);
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
        TestSuiteReq request = new TestSuiteReq("Updated Suite", null, null, true, null);
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
                        () -> testSuiteService.getAllByShelveFallback(shelveId, 1, 10, exception));

        assertEquals(
                "Test suite service is currently unavailable. Please try again later.",
                thrown.getMessage());
        assertSame(exception, thrown.getCause());
    }

    @Test
    void create_generatesSlugFromTitle_andMapsNewFields() {
        TestSuiteReq req =
                new TestSuiteReq("  Chương 1: Cell Biology! ", "  intro ", 15, null, null);
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
        TestSuiteReq req = new TestSuiteReq("Final", null, null, true, null);
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
        TestSuiteReq req = new TestSuiteReq("???", null, null, true, null);
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
                shelveId, testSuiteId, new TestSuiteReq("Chapter 1 Review", "", 30, false, null));

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

        testSuiteService.update(
                shelveId, testSuiteId, new TestSuiteReq("New", null, null, null, null));

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

    private TestSuiteEntity publicSuite() {
        Shelf otherShelf = new Shelf();
        otherShelf.setId(UUID.randomUUID());
        TestSuiteEntity suite = new TestSuiteEntity();
        suite.setId(testSuiteId);
        suite.setTitle("Shared Quiz");
        suite.setIsPublic(true);
        suite.setDeleted(false);
        suite.setShelf(otherShelf);
        return suite;
    }

    @Test
    void discoverPublic_blankQuery_listsAllPublic() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findAllPublic(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(publicSuite())));

        ApiRes result = testSuiteService.discoverPublic("  ", 0, 10);

        assertTrue(result.getBody().isSuccess());
        verify(testSuiteRepository, never()).findPublicByQuery(any(), any(), any());
    }

    @Test
    void discoverPublic_withQuery_searches() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findPublicByQuery(
                        eq("bio"), eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(publicSuite())));

        testSuiteService.discoverPublic(" bio ", 0, 10);

        verify(testSuiteRepository)
                .findPublicByQuery(eq("bio"), eq(currentUserId), any(Pageable.class));
    }

    @Test
    void cloneSuite_copiesSuiteAndQuestionsIntoChosenShelf() {
        TestSuiteEntity source = publicSuite();
        QuestionEntity question =
                QuestionEntity.builder()
                        .text("2+2?")
                        .type(QuestionType.SINGLE_CHOICE)
                        .metadata("{}")
                        .testSuite(source)
                        .build();
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(
                        inv -> {
                            TestSuiteEntity t = inv.getArgument(0);
                            t.setId(UUID.randomUUID());
                            return t;
                        });
        when(questionRepository.findAllByTestSuite(source)).thenReturn(List.of(question));

        ApiRes result = testSuiteService.cloneSuite(testSuiteId, shelveId);

        assertEquals(201, result.getStatusCode().value());
        org.mockito.ArgumentCaptor<TestSuiteEntity> saved =
                org.mockito.ArgumentCaptor.forClass(TestSuiteEntity.class);
        verify(testSuiteRepository).save(saved.capture());
        assertSame(shelve, saved.getValue().getShelf());
        assertFalse(saved.getValue().getIsPublic());
        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<QuestionEntity>> copies =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(questionRepository).saveAll(copies.capture());
        assertEquals("2+2?", copies.getValue().get(0).getText());
        assertNotSame(question, copies.getValue().get(0));
    }

    @Test
    void cloneSuite_withoutShelf_usesFirstShelf_orRejectsWhenNone() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(publicSuite()));
        when(shelfRepository.findAllByUserId(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ApiRes result = testSuiteService.cloneSuite(testSuiteId, null);

        assertEquals(400, result.getStatusCode().value());
        verify(testSuiteRepository, never()).save(any());
    }

    @Test
    void cloneSuite_privateSuite_throwsNotFound() {
        TestSuiteEntity source = publicSuite();
        source.setIsPublic(false);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));

        assertThrows(
                NotFoundException.class, () -> testSuiteService.cloneSuite(testSuiteId, shelveId));
    }

    @Test
    void cloneSuite_foreignTargetShelf_throwsNotFound() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(publicSuite()));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> testSuiteService.cloneSuite(testSuiteId, shelveId));
    }

    @Test
    void discoverPublic_clampsPagingAndMapsToViewModels() {
        when(currentUser.id()).thenReturn(currentUserId);
        TestSuiteEntity suite = publicSuite();
        when(questionRepository.countByTestSuite(suite)).thenReturn(4L);
        when(testSuiteRepository.findAllPublic(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(suite)));

        ApiRes result = testSuiteService.discoverPublic(null, -3, 500);

        org.mockito.ArgumentCaptor<Pageable> pageable =
                org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(testSuiteRepository).findAllPublic(eq(currentUserId), pageable.capture());
        assertEquals(0, pageable.getValue().getPageNumber());
        assertEquals(50, pageable.getValue().getPageSize());
        @SuppressWarnings("unchecked")
        PagingRes<TestSuiteRes> body = (PagingRes<TestSuiteRes>) result.getBody().data();
        assertEquals(1, body.entities().size());
        assertEquals(4L, body.entities().get(0).questionCount());
        assertTrue(body.entities().get(0).isPublic());
    }

    @Test
    void discoverPublic_enforcesMinimumPageSize() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findAllPublic(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        testSuiteService.discoverPublic("", 2, 0);

        org.mockito.ArgumentCaptor<Pageable> pageable =
                org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(testSuiteRepository).findAllPublic(eq(currentUserId), pageable.capture());
        assertEquals(2, pageable.getValue().getPageNumber());
        assertEquals(1, pageable.getValue().getPageSize());
    }

    @Test
    void cloneSuite_withoutShelf_usesFirstShelf() {
        TestSuiteEntity source = publicSuite();
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));
        when(shelfRepository.findAllByUserId(eq(currentUserId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelve)));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(questionRepository.findAllByTestSuite(source)).thenReturn(List.of());

        ApiRes result = testSuiteService.cloneSuite(testSuiteId, null);

        assertEquals(201, result.getStatusCode().value());
        org.mockito.ArgumentCaptor<TestSuiteEntity> saved =
                org.mockito.ArgumentCaptor.forClass(TestSuiteEntity.class);
        verify(testSuiteRepository).save(saved.capture());
        assertSame(shelve, saved.getValue().getShelf());
        assertEquals("Shared Quiz", saved.getValue().getTitle());
        assertEquals("shared-quiz", saved.getValue().getSlug());
        assertTrue(saved.getValue().getIsActive());
        assertNull(saved.getValue().getHighestScore());
    }

    @Test
    void cloneSuite_takesNextFreeSlugInTheTargetShelf() {
        TestSuiteEntity source = publicSuite();
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findSlugsByShelfExcluding(eq(shelve), any()))
                .thenReturn(List.of("shared-quiz"));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(questionRepository.findAllByTestSuite(source)).thenReturn(List.of());

        testSuiteService.cloneSuite(testSuiteId, shelveId);

        org.mockito.ArgumentCaptor<TestSuiteEntity> saved =
                org.mockito.ArgumentCaptor.forClass(TestSuiteEntity.class);
        verify(testSuiteRepository).save(saved.capture());
        assertEquals("shared-quiz-2", saved.getValue().getSlug());
    }

    @Test
    void cloneSuite_deletedPublicSuite_throwsNotFound() {
        TestSuiteEntity source = publicSuite();
        source.setDeleted(true);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));

        assertThrows(NotFoundException.class, () -> testSuiteService.cloneSuite(testSuiteId, null));
    }

    @Test
    void cloneSuite_unknownId_throwsNotFound() {
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> testSuiteService.cloneSuite(testSuiteId, null));
    }

    private TestSuiteEntity createWith(Boolean isPublic) {
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        testSuiteService.create(shelveId, new TestSuiteReq("A", null, null, null, isPublic));
        org.mockito.ArgumentCaptor<TestSuiteEntity> saved =
                org.mockito.ArgumentCaptor.forClass(TestSuiteEntity.class);
        verify(testSuiteRepository).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void create_defaultsToPrivate() {
        assertFalse(createWith(null).getIsPublic());
    }

    @Test
    void create_honoursIsPublic() {
        assertTrue(createWith(true).getIsPublic());
    }

    private TestSuiteEntity updateWith(Boolean isPublic) {
        TestSuiteEntity existing = publicSuite();
        existing.setShelf(shelve);
        when(currentUser.id()).thenReturn(currentUserId);
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(existing));
        testSuiteService.update(
                shelveId, testSuiteId, new TestSuiteReq("Shared Quiz", null, null, null, isPublic));
        return existing;
    }

    @Test
    void update_keepsVisibilityWhenNotProvided() {
        assertTrue(updateWith(null).getIsPublic());
    }

    @Test
    void update_changesVisibilityWhenProvided() {
        assertFalse(updateWith(false).getIsPublic());
    }

    @Test
    void discoverAndCloneFallbacks_preserveDomainErrors_andWrapOthers() {
        assertThrows(
                NotFoundException.class,
                () -> testSuiteService.discoverFallback("q", 0, 10, new NotFoundException("x")));
        assertThrows(
                RetryLaterException.class,
                () -> testSuiteService.discoverFallback("q", 0, 10, new RuntimeException()));
        assertThrows(
                ValidationException.class,
                () ->
                        testSuiteService.cloneSuiteFallback(
                                testSuiteId, null, new ValidationException("x")));
        assertThrows(
                UnauthenticatedException.class,
                () ->
                        testSuiteService.cloneSuiteFallback(
                                testSuiteId, null, new UnauthenticatedException("x")));
        assertThrows(
                RetryLaterException.class,
                () ->
                        testSuiteService.cloneSuiteFallback(
                                testSuiteId, null, new RuntimeException()));
    }

    @Test
    void cloneSuite_ownSuite_isRejectedWithConflict() {
        TestSuiteEntity source = publicSuite();
        source.setShelf(shelve);
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));

        ApiRes result = testSuiteService.cloneSuite(testSuiteId, shelveId);

        assertEquals(409, result.getStatusCode().value());
        verify(testSuiteRepository, never()).save(any());
    }

    @Test
    void cloneSuite_alreadyCloned_isRejectedWithConflict() {
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(publicSuite()));
        when(testSuiteRepository.hasCloneOf(testSuiteId, currentUserId)).thenReturn(true);

        ApiRes result = testSuiteService.cloneSuite(testSuiteId, null);

        assertEquals(409, result.getStatusCode().value());
        verify(testSuiteRepository, never()).save(any());
    }

    @Test
    void cloneSuite_remembersTheSourceSuite() {
        TestSuiteEntity source = publicSuite();
        when(currentUser.id()).thenReturn(currentUserId);
        when(testSuiteRepository.findById(testSuiteId)).thenReturn(Optional.of(source));
        when(shelfRepository.findByIdAndUserId(shelveId, currentUserId))
                .thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(questionRepository.findAllByTestSuite(source)).thenReturn(List.of());

        testSuiteService.cloneSuite(testSuiteId, shelveId);

        org.mockito.ArgumentCaptor<TestSuiteEntity> saved =
                org.mockito.ArgumentCaptor.forClass(TestSuiteEntity.class);
        verify(testSuiteRepository).save(saved.capture());
        assertEquals(testSuiteId, saved.getValue().getClonedFromId());
    }
}
