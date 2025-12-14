/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.controller;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.osmosis.api.service.DeckService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.DeckReq;
import com.app.osmosis.api.viewmodel.UpdateDeckReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class DeckControllerTest {

    @Mock private DeckService deckService;

    @InjectMocks private DeckController deckController;

    private UUID deckId;

    @BeforeEach
    void setUp() {
        deckId = UUID.randomUUID();
    }

    @Test
    void createDeck_withValidReq_thenReturnsSuccess() {
        DeckReq deckReq = new DeckReq("Test Deck", "Description");
        ApiRes expected = mock(ApiRes.class);
        when(deckService.createDeck(eq(deckReq))).thenReturn(expected);

        ApiRes actual = deckController.createDeck(deckReq);

        verify(deckService, times(1)).createDeck(eq(deckReq));
        assertSame(expected, actual);
    }

    @Test
    void getAllDecks_withDefaultParams_thenReturnsSuccess() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getAllDecks(any(Pageable.class))).thenReturn(expected);

        ApiRes actual = deckController.getAllDecks(0, 10, "createdAt", "DESC");

        verify(deckService, times(1)).getAllDecks(any(Pageable.class));
        assertSame(expected, actual);
    }

    @Test
    void getAllDecks_withAscendingSortDirection_thenReturnsSuccess() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getAllDecks(any(Pageable.class))).thenReturn(expected);

        ApiRes actual = deckController.getAllDecks(0, 10, "name", "ASC");

        verify(deckService, times(1)).getAllDecks(any(Pageable.class));
        assertSame(expected, actual);
    }

    @Test
    void getAllDecks_withCustomPageSize_thenReturnsSuccess() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getAllDecks(any(Pageable.class))).thenReturn(expected);

        ApiRes actual = deckController.getAllDecks(2, 25, "updatedAt", "DESC");

        verify(deckService, times(1)).getAllDecks(any(Pageable.class));
        assertSame(expected, actual);
    }

    @Test
    void getDeckById_withValidId_thenReturnsSuccess() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getDeckById(deckId)).thenReturn(expected);

        ApiRes actual = deckController.getDeckById(deckId);

        verify(deckService, times(1)).getDeckById(deckId);
        assertSame(expected, actual);
    }

    @Test
    void updateDeck_withValidReq_thenReturnsSuccess() {
        UpdateDeckReq updateDeckReq = new UpdateDeckReq("Updated Deck", "Updated Description");
        ApiRes expected = mock(ApiRes.class);
        when(deckService.updateDeck(eq(deckId), eq(updateDeckReq))).thenReturn(expected);

        ApiRes actual = deckController.updateDeck(deckId, updateDeckReq);

        verify(deckService, times(1)).updateDeck(eq(deckId), eq(updateDeckReq));
        assertSame(expected, actual);
    }

    @Test
    void softDeleteDeck_withValidId_thenReturnsSuccess() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.softDeleteDeck(eq(deckId))).thenReturn(expected);

        ApiRes actual = deckController.softDeleteDeck(deckId);

        verify(deckService, times(1)).softDeleteDeck(eq(deckId));
        assertSame(expected, actual);
    }
}
