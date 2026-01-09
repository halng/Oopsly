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

import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.UpdateDifficultyReq;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CardControllerTest {

    @Mock private CardService cardService;

    @InjectMocks private CardController cardController;

    private CardReq cardReq;
    private UpdateDifficultyReq updateDifficultyReq;
    private UUID deckId;
    private UUID cardId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Test Topic", "Test Answer"));
        cardReq = new CardReq(cardItems);
        updateDifficultyReq = new UpdateDifficultyReq(DifficultyLevel.GOOD);
        deckId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToCardService() {
        when(cardService.create(deckId, cardReq)).thenReturn(expectedResponse);

        ApiRes result = cardController.create(deckId, cardReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).create(deckId, cardReq);
    }

    @Test
    void updateDifficulty_delegatesToCardService() {
        when(cardService.updateDifficulty(deckId, cardId, DifficultyLevel.GOOD))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.updateDifficulty(deckId, cardId, updateDifficultyReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).updateDifficulty(deckId, cardId, DifficultyLevel.GOOD);
    }

    @Test
    void getById_delegatesToCardService() {
        when(cardService.getById(deckId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.getById(deckId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getById(deckId, cardId);
    }

    @Test
    void deleteById_delegatesToCardService() {
        when(cardService.delete(deckId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.deleteById(deckId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).delete(deckId, cardId);
    }

    @Test
    void getAll_delegatesToCardService() {
        int page = 0;
        int size = 10;
        when(cardService.getAll(deckId, page, size)).thenReturn(expectedResponse);

        ApiRes result = cardController.getAll(deckId, page, size);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getAll(deckId, page, size);
    }

    @Test
    void getAll_throwsIllegalArgumentException_whenPageIsNegative() {
        int page = -1;
        int size = 10;

        assertThrows(
                IllegalArgumentException.class, () -> cardController.getAll(deckId, page, size));
        verify(cardService, never()).getAll(any(), anyInt(), anyInt());
    }

    @Test
    void getAll_throwsIllegalArgumentException_whenSizeIsZero() {
        int page = 0;
        int size = 0;

        assertThrows(
                IllegalArgumentException.class, () -> cardController.getAll(deckId, page, size));
        verify(cardService, never()).getAll(any(), anyInt(), anyInt());
    }

    @Test
    void getAll_throwsIllegalArgumentException_whenSizeIsNegative() {
        int page = 0;
        int size = -1;

        assertThrows(
                IllegalArgumentException.class, () -> cardController.getAll(deckId, page, size));
        verify(cardService, never()).getAll(any(), anyInt(), anyInt());
    }
}
