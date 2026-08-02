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

package com.app.oopsly.api.unit.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.TestSuiteController;
import com.app.oopsly.api.service.TestSuiteService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TestSuiteControllerTest {

    @Mock private TestSuiteService testSuiteService;

    @InjectMocks private TestSuiteController testSuiteController;

    private TestSuiteReq testSuiteReq;
    private UUID shelveId;
    private UUID testSuiteId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", true, null, null);
        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToTestSuiteService() {
        when(testSuiteService.create(shelveId, testSuiteReq)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.create(shelveId, testSuiteReq);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).create(shelveId, testSuiteReq);
    }

    @Test
    void update_delegatesToTestSuiteService() {
        when(testSuiteService.update(shelveId, testSuiteId, testSuiteReq))
                .thenReturn(expectedResponse);

        ApiRes result = testSuiteController.update(shelveId, testSuiteId, testSuiteReq);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).update(shelveId, testSuiteId, testSuiteReq);
    }

    @Test
    void getById_delegatesToTestSuiteService() {
        when(testSuiteService.getById(shelveId, testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.getById(shelveId, testSuiteId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).getById(shelveId, testSuiteId);
    }

    @Test
    void deleteById_delegatesToTestSuiteService() {
        when(testSuiteService.delete(shelveId, testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.deleteById(shelveId, testSuiteId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).delete(shelveId, testSuiteId);
    }

    @Test
    void getAllByShelve_delegatesToTestSuiteService() {
        when(testSuiteService.getAllByShelve(shelveId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.getAllByShelve(shelveId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).getAllByShelve(shelveId);
    }

    @Test
    void runPreset_delegatesToTestSuiteService() {
        when(testSuiteService.run(shelveId, testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.runPreset(shelveId, testSuiteId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).run(shelveId, testSuiteId);
    }

    @Test
    void autoGenerate_delegatesToTestSuiteService() {
        UUID subjectId = UUID.randomUUID();
        when(testSuiteService.autoGenerate(shelveId, subjectId, 8)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.autoGenerate(shelveId, subjectId, 8);

        assertSame(expectedResponse, result);
        verify(testSuiteService).autoGenerate(shelveId, subjectId, 8);
    }
}
