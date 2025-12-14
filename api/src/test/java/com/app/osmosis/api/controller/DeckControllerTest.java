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
import com.app.osmosis.api.viewmodel.CreateDeck;
import com.app.osmosis.api.viewmodel.UpdateDeck;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

@ExtendWith(MockitoExtension.class)
class DeckControllerTest {

    @Mock private DeckService deckService;

    @InjectMocks private DeckController deckController;

    private UUID userId;
    private UUID deckId;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        deckId = UUID.randomUUID();
        userDetails =
                User.withUsername(userId.toString())
                        .password("password")
                        .authorities("USER")
                        .build();
    }

    @Test
    void createDeck_delegatesToService_and_returnsServiceResponse() {
        CreateDeck createDeck = new CreateDeck("Test Deck", "Description");
        ApiRes expected = mock(ApiRes.class);
        when(deckService.createDeck(eq(createDeck), eq(userId))).thenReturn(expected);

        ApiRes actual = deckController.createDeck(createDeck, userDetails);

        verify(deckService, times(1)).createDeck(eq(createDeck), eq(userId));
        assertSame(expected, actual);
    }

    @Test
    void getAllDecks_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getAllDecks(any(Pageable.class))).thenReturn(expected);

        ApiRes actual = deckController.getAllDecks(0, 10, "createdAt", "DESC");

        verify(deckService, times(1)).getAllDecks(any(Pageable.class));
        assertSame(expected, actual);
    }

    @Test
    void getDeckById_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.getDeckById(deckId)).thenReturn(expected);

        ApiRes actual = deckController.getDeckById(deckId);

        verify(deckService, times(1)).getDeckById(deckId);
        assertSame(expected, actual);
    }

    @Test
    void updateDeck_delegatesToService_and_returnsServiceResponse() {
        UpdateDeck updateDeck = new UpdateDeck("Updated Deck", "Updated Description");
        ApiRes expected = mock(ApiRes.class);
        when(deckService.updateDeck(eq(deckId), eq(updateDeck), eq(userId))).thenReturn(expected);

        ApiRes actual = deckController.updateDeck(deckId, updateDeck, userDetails);

        verify(deckService, times(1)).updateDeck(eq(deckId), eq(updateDeck), eq(userId));
        assertSame(expected, actual);
    }

    @Test
    void softDeleteDeck_delegatesToService_and_returnsServiceResponse() {
        ApiRes expected = mock(ApiRes.class);
        when(deckService.softDeleteDeck(eq(deckId), eq(userId))).thenReturn(expected);

        ApiRes actual = deckController.softDeleteDeck(deckId, userDetails);

        verify(deckService, times(1)).softDeleteDeck(eq(deckId), eq(userId));
        assertSame(expected, actual);
    }
}
