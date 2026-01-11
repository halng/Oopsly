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

import com.app.oopsly.api.service.CollectionService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CollectionReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CollectionControllerTest {

    @Mock private CollectionService collectionService;

    @InjectMocks private CollectionController collectionController;

    private CollectionReq collectionReq;
    private UUID deckId;
    private UUID collectionId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        collectionReq = new CollectionReq("Test Collection", "Test Description");
        deckId = UUID.randomUUID();
        collectionId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToCollectionService() {
        when(collectionService.create(deckId, collectionReq)).thenReturn(expectedResponse);

        ApiRes result = collectionController.create(deckId, collectionReq);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).create(deckId, collectionReq);
    }

    @Test
    void getAllByDeck_delegatesToCollectionService() {
        int page = 0;
        int size = 10;
        when(collectionService.getAllByDeck(deckId, page, size)).thenReturn(expectedResponse);

        ApiRes result = collectionController.getAllByDeck(deckId, page, size);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).getAllByDeck(deckId, page, size);
    }

    @Test
    void getAllByDeck_withValidPageAndSize_delegatesToCollectionService() {
        int page = 1;
        int size = 20;
        when(collectionService.getAllByDeck(deckId, page, size)).thenReturn(expectedResponse);

        ApiRes result = collectionController.getAllByDeck(deckId, page, size);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).getAllByDeck(deckId, page, size);
    }

    @Test
    void update_delegatesToCollectionService() {
        when(collectionService.update(deckId, collectionId, collectionReq))
                .thenReturn(expectedResponse);

        ApiRes result = collectionController.update(deckId, collectionId, collectionReq);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).update(deckId, collectionId, collectionReq);
    }

    @Test
    void getById_delegatesToCollectionService() {
        when(collectionService.getById(deckId, collectionId)).thenReturn(expectedResponse);

        ApiRes result = collectionController.getById(deckId, collectionId);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).getById(deckId, collectionId);
    }

    @Test
    void delete_delegatesToCollectionService() {
        when(collectionService.delete(deckId, collectionId)).thenReturn(expectedResponse);

        ApiRes result = collectionController.delete(deckId, collectionId);

        assertSame(expectedResponse, result);
        verify(collectionService, times(1)).delete(deckId, collectionId);
    }
}
