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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.app.osmosis.api.service.OsmosisTutorService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.TutorTurnResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class VoiceTutorControllerTest {

    @Mock private OsmosisTutorService osmosisTutorService;

    @InjectMocks private VoiceTutorController voiceTutorController;

    private UUID deckId;
    private UUID sessionId;
    private UUID cardId;
    private TutorTurnResponse mockResponse;

    @BeforeEach
    void setUp() {
        deckId = UUID.randomUUID();
        sessionId = UUID.randomUUID();
        cardId = UUID.randomUUID();

        mockResponse =
                new TutorTurnResponse(
                        sessionId,
                        deckId,
                        cardId,
                        "What is Java?",
                        "A programming language",
                        "Correct! Well done.",
                        "base64AudioData",
                        Instant.now().plusSeconds(600));
    }

    @Test
    void handleVoiceTurn_delegatesToService_withAllParameters() throws IOException {
        MultipartFile audio = mock(MultipartFile.class);
        String text = "Test text";

        when(osmosisTutorService.handleVoiceTurn(deckId, sessionId, audio, text))
                .thenReturn(mockResponse);

        ApiRes result = voiceTutorController.handleVoiceTurn(deckId, sessionId, audio, text);

        assertNotNull(result);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(osmosisTutorService, times(1)).handleVoiceTurn(deckId, sessionId, audio, text);
    }

    @Test
    void handleVoiceTurn_acceptsNullSessionId() throws IOException {
        when(osmosisTutorService.handleVoiceTurn(eq(deckId), isNull(), isNull(), anyString()))
                .thenReturn(mockResponse);

        ApiRes result = voiceTutorController.handleVoiceTurn(deckId, null, null, "Hello");

        assertNotNull(result);
        verify(osmosisTutorService, times(1))
                .handleVoiceTurn(eq(deckId), isNull(), isNull(), eq("Hello"));
    }

    @Test
    void handleVoiceTurn_acceptsNullAudio() throws IOException {
        when(osmosisTutorService.handleVoiceTurn(eq(deckId), any(), isNull(), anyString()))
                .thenReturn(mockResponse);

        ApiRes result = voiceTutorController.handleVoiceTurn(deckId, sessionId, null, "Text only");

        assertNotNull(result);
        verify(osmosisTutorService, times(1))
                .handleVoiceTurn(eq(deckId), eq(sessionId), isNull(), eq("Text only"));
    }

    @Test
    void handleVoiceTurn_acceptsNullText() throws IOException {
        MultipartFile audio = mock(MultipartFile.class);

        when(osmosisTutorService.handleVoiceTurn(eq(deckId), any(), any(), isNull()))
                .thenReturn(mockResponse);

        ApiRes result = voiceTutorController.handleVoiceTurn(deckId, sessionId, audio, null);

        assertNotNull(result);
        verify(osmosisTutorService, times(1))
                .handleVoiceTurn(eq(deckId), eq(sessionId), eq(audio), isNull());
    }

    @Test
    void handleVoiceTurn_returnsResponseWithData() throws IOException {
        when(osmosisTutorService.handleVoiceTurn(any(), any(), any(), any()))
                .thenReturn(mockResponse);

        ApiRes result = voiceTutorController.handleVoiceTurn(deckId, null, null, "Text");

        assertNotNull(result);
        assertNotNull(result.getBody());
        assertTrue(result.getBody().isSuccess());
        assertEquals("Tutor turn completed", result.getBody().message());
        assertInstanceOf(TutorTurnResponse.class, result.getBody().data());
    }

    @Test
    void handleVoiceTurn_propagatesServiceException() throws IOException {
        IOException testException = new IOException("File read error");

        when(osmosisTutorService.handleVoiceTurn(any(), any(), any(), any()))
                .thenThrow(testException);

        assertThrows(
                IOException.class,
                () -> voiceTutorController.handleVoiceTurn(deckId, null, null, "Text"));

        verify(osmosisTutorService, times(1)).handleVoiceTurn(any(), any(), any(), any());
    }
}
