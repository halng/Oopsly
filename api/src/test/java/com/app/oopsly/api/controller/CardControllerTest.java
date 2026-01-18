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
    private List<UpdateDifficultyReq> updateDifficultyReq;
    private UUID deckId;
    private UUID collectionId;
    private UUID cardId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        List<CardItemReq> cardItems = List.of(new CardItemReq("Test Topic", "Test Answer"));
        cardReq = new CardReq(cardItems);
        updateDifficultyReq = List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name()));
        deckId = UUID.randomUUID();
        collectionId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        expectedResponse = ApiRes.ok("Success");
    }

    @Test
    void create_delegatesToCardService() {
        when(cardService.create(deckId, collectionId, cardReq)).thenReturn(expectedResponse);

        ApiRes result = cardController.create(deckId, collectionId, cardReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).create(deckId, collectionId, cardReq);
    }

    @Test
    void updateDifficulty_delegatesToCardService() {

        when(cardService.updateDifficulty(deckId, collectionId, updateDifficultyReq))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.updateDifficulty(deckId, collectionId, updateDifficultyReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).updateDifficulty(deckId, collectionId, updateDifficultyReq);
    }

    @Test
    void getById_delegatesToCardService() {
        when(cardService.getById(deckId, collectionId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.getById(deckId, collectionId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getById(deckId, collectionId, cardId);
    }

    @Test
    void deleteById_delegatesToCardService() {
        when(cardService.delete(deckId, collectionId, cardId)).thenReturn(expectedResponse);

        ApiRes result = cardController.deleteById(deckId, collectionId, cardId);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).delete(deckId, collectionId, cardId);
    }

    @Test
    void getAll_delegatesToCardService() {
        int page = 0;
        int size = 10;
        when(cardService.getAllCardsByCollection(deckId, collectionId, page, size))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.getAllCardsByCollection(deckId, collectionId, page, size);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getAllCardsByCollection(deckId, collectionId, page, size);
    }

    @Test
    void getAll_withValidPageAndSize_delegatesToCardService() {
        int page = 1;
        int size = 20;
        when(cardService.getAllCardsByCollection(deckId, collectionId, page, size))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.getAllCardsByCollection(deckId, collectionId, page, size);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).getAllCardsByCollection(deckId, collectionId, page, size);
    }

    @Test
    void create_withMultipleCards_delegatesToCardService() {
        List<CardItemReq> multipleCardItems =
                List.of(
                        new CardItemReq("Topic 1", "Answer 1"),
                        new CardItemReq("Topic 2", "Answer 2"),
                        new CardItemReq("Topic 3", "Answer 3"));
        CardReq multipleCardsReq = new CardReq(multipleCardItems);
        when(cardService.create(deckId, collectionId, multipleCardsReq))
                .thenReturn(expectedResponse);

        ApiRes result = cardController.create(deckId, collectionId, multipleCardsReq);

        assertSame(expectedResponse, result);
        verify(cardService, times(1)).create(deckId, collectionId, multipleCardsReq);
    }
}
