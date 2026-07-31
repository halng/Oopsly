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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.CardController;
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
    private List<UpdateDifficultyReq> updateDifficultyReq;
    private UUID shelveId;
    private UUID subjectId;
    private UUID cardId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Test Topic", "Test Answer"));
        cardReq = new CardReq(cardItems);
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        shelveId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToCardService() {
        when(cardService.create(shelveId, subjectId, cardReq)).thenReturn(expectedResponse);

        ApiRes result = cardController.create(shelveId, subjectId, cardReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).create(shelveId, subjectId, cardReq);
    }

    @Test
    void updateDifficulty_delegatesToCardService() {

        when(cardService.updateDifficulty(shelveId, subjectId, updateDifficultyReq))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.updateDifficulty(shelveId, subjectId, updateDifficultyReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).updateDifficulty(shelveId, subjectId, updateDifficultyReq);
    }

    @Test
    void getById_delegatesToCardService() {
        when(cardService.getById(shelveId, subjectId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.getById(shelveId, subjectId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getById(shelveId, subjectId, cardId);
    }

    @Test
    void deleteById_delegatesToCardService() {
        when(cardService.delete(shelveId, subjectId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.deleteById(shelveId, subjectId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).delete(shelveId, subjectId, cardId);
    }

    @Test
    void getAll_delegatesToCardService() {
        int page = 0;
        int size = 10;
        when(cardService.getAllCardsBySubject(shelveId, subjectId, page, size))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.getAllCardsBySubject(shelveId, subjectId, page, size);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getAllCardsBySubject(shelveId, subjectId, page, size);
    }

    @Test
    void getAll_withValidPageAndSize_delegatesToCardService() {
        int page = 1;
        int size = 20;
        when(cardService.getAllCardsBySubject(shelveId, subjectId, page, size))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.getAllCardsBySubject(shelveId, subjectId, page, size);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getAllCardsBySubject(shelveId, subjectId, page, size);
    }

    @Test
    void create_withMultipleCards_delegatesToCardService() {
        List<CardItemReq> multipleCardItems =
                List.of(
                        new CardItemReq("Topic 1", "Answer 1"),
                        new CardItemReq("Topic 2", "Answer 2"),
                        new CardItemReq("Topic 3", "Answer 3"));
        CardReq multipleCardsReq = new CardReq(multipleCardItems);
        when(cardService.create(shelveId, subjectId, multipleCardsReq))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.create(shelveId, subjectId, multipleCardsReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).create(shelveId, subjectId, multipleCardsReq);
    }

    @Test
    void updateCard_delegatesToCardService() {
        CardItemReq item = new CardItemReq("F", "B");
        when(cardService.updateCard(shelveId, subjectId, cardId, item))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.updateCard(shelveId, subjectId, cardId, item);

        assertSame(expectedResponse, result);
        verify(cardService).updateCard(shelveId, subjectId, cardId, item);
    }

    @Test
    void getDueCards_delegatesToCardService() {
        when(cardService.getDueCards(shelveId, subjectId, 10)).thenReturn(expectedResponse);

        ApiRes result = cardController.getDueCards(shelveId, subjectId, 10);

        assertSame(expectedResponse, result);
        verify(cardService).getDueCards(shelveId, subjectId, 10);
    }

    @Test
    void getAll_withInvalidPage_returnsBadRequest() {
        ApiRes result = cardController.getAllCardsBySubject(shelveId, subjectId, -1, 10);
        assertEquals(400, result.getStatusCode().value());
        verify(cardService, never()).getAllCardsBySubject(any(), any(), anyInt(), anyInt());
    }

    @Test
    void getAll_withInvalidSize_returnsBadRequest() {
        ApiRes result = cardController.getAllCardsBySubject(shelveId, subjectId, 0, 0);
        assertEquals(400, result.getStatusCode().value());
    }
}
