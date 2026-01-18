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

import com.app.oopsly.api.service.DeckService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DeckControllerTest {

    @Mock private DeckService deckService;

    @InjectMocks private DeckController deckController;

    private DeckReq deckReq;
    private UUID deckId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        deckReq =
                new DeckReq(
                        "Test Deck",
                        "Test description with sufficient length to meet validation requirements");
        deckId = UUID.randomUUID();
        expectedResponse = ApiRes.ok("Success");
    }

    @Test
    void create_delegatesToDeckService() {
        when(deckService.create(deckReq)).thenReturn(expectedResponse);

        ApiRes result = deckController.create(deckReq);

        assertSame(expectedResponse, result);
        verify(deckService, times(1)).create(deckReq);
    }

    @Test
    void update_delegatesToDeckService() {
        when(deckService.update(deckReq, deckId)).thenReturn(expectedResponse);

        ApiRes result = deckController.update(deckReq, deckId);

        assertSame(expectedResponse, result);
        verify(deckService, times(1)).update(deckReq, deckId);
    }

    @Test
    void getById_delegatesToDeckService() {
        when(deckService.getById(deckId)).thenReturn(expectedResponse);

        ApiRes result = deckController.getById(deckId);

        assertSame(expectedResponse, result);
        verify(deckService, times(1)).getById(deckId);
    }

    @Test
    void deleteById_delegatesToDeckService() {
        when(deckService.delete(deckId)).thenReturn(expectedResponse);

        ApiRes result = deckController.deleteById(deckId);

        assertSame(expectedResponse, result);
        verify(deckService, times(1)).delete(deckId);
    }

    @Test
    void getAll_delegatesToDeckService() {
        int page = 0;
        int size = 10;
        when(deckService.getAll(page, size)).thenReturn(expectedResponse);

        ApiRes result = deckController.getAll(page, size);

        assertSame(expectedResponse, result);
        verify(deckService, times(1)).getAll(page, size);
    }
}
