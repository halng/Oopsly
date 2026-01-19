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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.TestSuiteEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.repository.ShelveRepository;
import com.app.oopsly.api.repository.TestSuiteRepository;
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

    @Mock private ShelveRepository shelveRepository;

    @Mock private UserService userService;

    @InjectMocks private TestSuiteServiceImpl testSuiteService;

    private TestSuiteReq testSuiteReq;
    private User currentUser;
    private ShelveEntity shelve;
    private UUID shelveId;
    private UUID testSuiteId;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", true);
        currentUser = new User();
        currentUser.setEmail("test@example.com");
        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();

        shelve = new ShelveEntity();
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
        savedTestSuite.setShelve(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, testSuiteReq);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void create_throwsNotFoundException_whenDeckNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> testSuiteService.create(shelveId, testSuiteReq));
        verify(testSuiteRepository, never()).save(any(TestSuiteEntity.class));
    }

    @Test
    void update_updatesExistingTestSuite() {
        TestSuiteEntity existingTestSuite = new TestSuiteEntity();
        existingTestSuite.setId(testSuiteId);
        existingTestSuite.setTitle("Old Title");
        existingTestSuite.setIsActive(false);
        existingTestSuite.setShelve(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve)).thenReturn(Optional.empty());

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
        existingTestSuite.setShelve(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
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
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> testSuiteService.delete(shelveId, testSuiteId));
    }

    @Test
    void getById_returnsTestSuite() {
        TestSuiteEntity testSuite = new TestSuiteEntity();
        testSuite.setId(testSuiteId);
        testSuite.setTitle(testSuiteReq.title());
        testSuite.setIsActive(testSuiteReq.isActive());
        testSuite.setShelve(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve))
                .thenReturn(Optional.of(testSuite));

        ApiRes result = testSuiteService.getById(shelveId, testSuiteId);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).findByIdAndShelve(testSuiteId, shelve);
    }

    @Test
    void getById_throwsNotFoundException_whenTestSuiteNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findByIdAndShelve(testSuiteId, shelve)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> testSuiteService.getById(shelveId, testSuiteId));
    }

    @Test
    void getAllByShelve_returnsAllTestSuites() {
        List<TestSuiteEntity> testSuites = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            TestSuiteEntity testSuite = new TestSuiteEntity();
            testSuite.setId(UUID.randomUUID());
            testSuite.setTitle("Test Suite " + i);
            testSuite.setIsActive(true);
            testSuite.setShelve(shelve);
            testSuites.add(testSuite);
        }

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.findAllByShelve(shelve)).thenReturn(testSuites);

        ApiRes result = testSuiteService.getAllByShelve(shelveId);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).findAllByShelve(shelve);
    }

    @Test
    void create_withNullIsActive_defaultsToTrue() {
        TestSuiteReq reqWithNullIsActive = new TestSuiteReq("New Test Suite", null);
        TestSuiteEntity savedTestSuite = new TestSuiteEntity();
        savedTestSuite.setId(testSuiteId);
        savedTestSuite.setTitle(reqWithNullIsActive.title());
        savedTestSuite.setIsActive(true);
        savedTestSuite.setShelve(shelve);

        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelveRepository.findByIdAndUser(shelveId, currentUser)).thenReturn(Optional.of(shelve));
        when(testSuiteRepository.save(any(TestSuiteEntity.class))).thenReturn(savedTestSuite);

        ApiRes result = testSuiteService.create(shelveId, reqWithNullIsActive);

        assertNotNull(result);
        verify(testSuiteRepository, times(1)).save(any(TestSuiteEntity.class));
    }

    @Test
    void testCreateFallback() {
        UUID shelveId = UUID.randomUUID();
        TestSuiteReq request = new TestSuiteReq("Test Suite", true);
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
        TestSuiteReq request = new TestSuiteReq("Updated Suite", true);
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
}
