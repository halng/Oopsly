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

import com.app.oopsly.api.controller.TestSuiteCardsController;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TestSuiteCardsControllerTest {

    @Mock private CardService cardService;

    @InjectMocks private TestSuiteCardsController testSuiteCardsController;

    private UUID testSuiteId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        testSuiteId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Cards retrieved successfully");
    }

    @Test
    void getCards_delegatesToCardService() {
        when(cardService.getCardsByTestSuite(testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = testSuiteCardsController.getCards(testSuiteId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getCardsByTestSuite(testSuiteId);
    }

    @Test
    void getCards_callsServiceSuccessfully() {
        ApiRes mockResponse = mock(ApiRes.class);

        when(cardService.getCardsByTestSuite(testSuiteId)).thenReturn(mockResponse);

        ApiRes response = testSuiteCardsController.getCards(testSuiteId);

        assertNotNull(response);
        verify(cardService, times(1)).getCardsByTestSuite(testSuiteId);
    }

    @Test
    void getCards_withDifferentTestSuiteIds_callsServiceWithCorrectId() {
        UUID testSuiteId1 = UUID.randomUUID();
        UUID testSuiteId2 = UUID.randomUUID();

        ApiRes response1 = mock(ApiRes.class);
        ApiRes response2 = mock(ApiRes.class);

        when(cardService.getCardsByTestSuite(testSuiteId1)).thenReturn(response1);
        when(cardService.getCardsByTestSuite(testSuiteId2)).thenReturn(response2);

        ApiRes actual1 = testSuiteCardsController.getCards(testSuiteId1);
        ApiRes actual2 = testSuiteCardsController.getCards(testSuiteId2);

        assertSame(response1, actual1);
        assertSame(response2, actual2);
        verify(cardService, times(1)).getCardsByTestSuite(testSuiteId1);
        verify(cardService, times(1)).getCardsByTestSuite(testSuiteId2);
    }

    @Test
    void getCards_multipleCallsSameTestSuiteId_callsServiceEachTime() {
        ApiRes mockResponse = mock(ApiRes.class);

        when(cardService.getCardsByTestSuite(testSuiteId)).thenReturn(mockResponse);

        testSuiteCardsController.getCards(testSuiteId);
        testSuiteCardsController.getCards(testSuiteId);
        testSuiteCardsController.getCards(testSuiteId);

        verify(cardService, times(3)).getCardsByTestSuite(testSuiteId);
    }

    @Test
    void getCards_serviceThrowsException_propagatesException() {
        when(cardService.getCardsByTestSuite(testSuiteId))
                .thenThrow(new RuntimeException("Service error"));

        assertThrows(RuntimeException.class, () -> testSuiteCardsController.getCards(testSuiteId));
        verify(cardService, times(1)).getCardsByTestSuite(testSuiteId);
    }

    @Test
    void constructor_initializesCardService() {
        CardService mockCardService = mock(CardService.class);

        TestSuiteCardsController controller = new TestSuiteCardsController(mockCardService);

        assertNotNull(controller);
    }
}
