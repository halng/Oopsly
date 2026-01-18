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

package com.app.oopsly.api.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

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
    private UUID deckId;
    private UUID testSuiteId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        testSuiteReq = new TestSuiteReq("Chapter 1 Review", true);
        deckId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();
        expectedResponse = ApiRes.ok("Success");
    }

    @Test
    void create_delegatesToTestSuiteService() {
        when(testSuiteService.create(deckId, testSuiteReq)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.create(deckId, testSuiteReq);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).create(deckId, testSuiteReq);
    }

    @Test
    void update_delegatesToTestSuiteService() {
        when(testSuiteService.update(deckId, testSuiteId, testSuiteReq))
                .thenReturn(expectedResponse);

        ApiRes result = testSuiteController.update(deckId, testSuiteId, testSuiteReq);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).update(deckId, testSuiteId, testSuiteReq);
    }

    @Test
    void getById_delegatesToTestSuiteService() {
        when(testSuiteService.getById(deckId, testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.getById(deckId, testSuiteId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).getById(deckId, testSuiteId);
    }

    @Test
    void deleteById_delegatesToTestSuiteService() {
        when(testSuiteService.delete(deckId, testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.deleteById(deckId, testSuiteId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).delete(deckId, testSuiteId);
    }

    @Test
    void getAllByDeck_delegatesToTestSuiteService() {
        when(testSuiteService.getAllByDeck(deckId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteController.getAllByDeck(deckId);

        assertSame(expectedResponse, result);
        verify(testSuiteService, times(1)).getAllByDeck(deckId);
    }
}
