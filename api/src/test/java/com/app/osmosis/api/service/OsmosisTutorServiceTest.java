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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.app.osmosis.api.entity.CardEntity;
import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.CardRepository;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.viewmodel.TutorTurnResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.audio.speech.SpeechPrompt;
import org.springframework.ai.audio.speech.SpeechResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemoryStore;
import org.springframework.ai.openai.audio.speech.OpenAiAudioSpeechModel;
import org.springframework.ai.openai.audio.transcription.OpenAiAudioTranscriptionModel;
import org.springframework.ai.openai.audio.transcription.TranscriptionPrompt;
import org.springframework.ai.openai.audio.transcription.TranscriptionResponse;
import org.springframework.ai.openai.metadata.OpenAiAudioResponseMetadata;
import org.springframework.web.multipart.MultipartFile;

@ExtendWith(MockitoExtension.class)
class OsmosisTutorServiceTest {

    @Mock private ChatClient.Builder chatClientBuilder;
    @Mock private ChatClient chatClient;
    @Mock private ChatClient.ChatClientRequest chatClientRequest;
    @Mock private ChatClient.ChatClientRequestSpec requestSpec;
    @Mock private ChatClient.CallResponseSpec callResponseSpec;

    @Mock private OpenAiAudioTranscriptionModel transcriptionModel;
    @Mock private OpenAiAudioSpeechModel speechModel;
    @Mock private SpacedRepetitionService spacedRepetitionService;
    @Mock private DeckRepository deckRepository;
    @Mock private CardRepository cardRepository;
    @Mock private ChatMemoryStore chatMemoryStore;
    @Mock private MultipartFile audioFile;

    private OsmosisTutorService osmosisTutorService;

    private DeckEntity deck;
    private CardEntity card1;
    private CardEntity card2;
    private UUID deckId;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        deckId = UUID.randomUUID();
        sessionId = UUID.randomUUID();

        deck = DeckEntity.builder().id(deckId).name("Java Concurrency").build();

        card1 =
                CardEntity.builder()
                        .id(UUID.randomUUID())
                        .deck(deck)
                        .prompt("What is a thread?")
                        .answer("A unit of execution")
                        .dueAt(Instant.now().minusSeconds(60))
                        .intervalMinutes(10)
                        .build();

        card2 =
                CardEntity.builder()
                        .id(UUID.randomUUID())
                        .deck(deck)
                        .prompt("What is synchronized?")
                        .answer("A keyword for locking")
                        .dueAt(Instant.now().minusSeconds(30))
                        .intervalMinutes(15)
                        .build();

        when(chatClientBuilder.defaultSystem(anyString())).thenReturn(chatClientBuilder);
        when(chatClientBuilder.build()).thenReturn(chatClient);

        osmosisTutorService =
                new OsmosisTutorService(
                        chatClientBuilder,
                        transcriptionModel,
                        speechModel,
                        spacedRepetitionService,
                        deckRepository,
                        cardRepository,
                        chatMemoryStore);
    }

    @Test
    void handleVoiceTurn_throwsNotFoundException_whenDeckNotFound() {
        when(deckRepository.findById(deckId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> osmosisTutorService.handleVoiceTurn(deckId, sessionId, null, "Hello"));

        verify(deckRepository, times(1)).findById(deckId);
    }

    @Test
    void handleVoiceTurn_throwsNotFoundException_whenNoDueCardsAvailable() throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> osmosisTutorService.handleVoiceTurn(deckId, null, null, "Hello"));

        verify(spacedRepetitionService, times(1)).findNextDueCard(deckId);
    }

    @Test
    void handleVoiceTurn_usesTextTranscript_whenAudioIsNull() throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("That's correct. Good job.");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        TutorTurnResponse response =
                osmosisTutorService.handleVoiceTurn(deckId, null, null, "A unit of execution");

        assertNotNull(response);
        assertEquals(deckId, response.deckId());
        assertEquals(card1.getId(), response.cardId());
        assertEquals(card1.getPrompt(), response.cardQuestion());
        assertEquals("A unit of execution", response.userTranscript());
        verify(transcriptionModel, never()).call(any(TranscriptionPrompt.class));
    }

    @Test
    void handleVoiceTurn_transcribesAudio_whenAudioProvided() throws IOException {
        byte[] audioData = new byte[] {1, 2, 3, 4};
        when(audioFile.isEmpty()).thenReturn(false);
        when(audioFile.getBytes()).thenReturn(audioData);

        TranscriptionResponse transcriptionResponse = mock(TranscriptionResponse.class);
        TranscriptionResponse.TranscriptionResult transcriptionResult =
                mock(TranscriptionResponse.TranscriptionResult.class);
        OpenAiAudioResponseMetadata metadata = mock(OpenAiAudioResponseMetadata.class);

        when(transcriptionModel.call(any(TranscriptionPrompt.class)))
                .thenReturn(transcriptionResponse);
        when(transcriptionResponse.getResult()).thenReturn(transcriptionResult);
        when(transcriptionResult.getOutput()).thenReturn("Transcribed text from audio");
        when(transcriptionResponse.getMetadata()).thenReturn(metadata);
        when(metadata.getModel()).thenReturn("whisper-1");
        when(metadata.getDuration()).thenReturn("2.5s");

        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("Correct!");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        TutorTurnResponse response =
                osmosisTutorService.handleVoiceTurn(deckId, sessionId, audioFile, null);

        assertNotNull(response);
        assertEquals("Transcribed text from audio", response.userTranscript());
        verify(transcriptionModel, times(1)).call(any(TranscriptionPrompt.class));
    }

    @Test
    void handleVoiceTurn_marksCardCorrect_whenTutorReplyIndicatesCorrectness() throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("That's right! Well done.");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        osmosisTutorService.handleVoiceTurn(deckId, null, null, "Answer");

        verify(spacedRepetitionService, times(1)).recordReview(card1.getId(), true);
    }

    @Test
    void handleVoiceTurn_marksCardIncorrect_whenTutorReplyDoesNotIndicateCorrectness()
            throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content())
                .thenReturn("Not quite. The answer is actually different.");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        osmosisTutorService.handleVoiceTurn(deckId, null, null, "Wrong answer");

        verify(spacedRepetitionService, times(1)).recordReview(card1.getId(), false);
    }

    @Test
    void handleVoiceTurn_returnsBase64EncodedAudio() throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("Good job!");

        byte[] audioBytes = new byte[] {10, 20, 30};
        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(audioBytes);

        TutorTurnResponse response =
                osmosisTutorService.handleVoiceTurn(deckId, null, null, "Answer");

        assertNotNull(response.tutorReplyAudioBase64());
        assertFalse(response.tutorReplyAudioBase64().isEmpty());
    }

    @Test
    void handleVoiceTurn_reusesActiveCard_whenSessionIdProvided() throws IOException {
        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(cardRepository.findById(card1.getId())).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("Correct!");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        // First call
        TutorTurnResponse firstResponse =
                osmosisTutorService.handleVoiceTurn(deckId, null, null, "Answer");
        UUID firstSessionId = firstResponse.sessionId();

        // Second call with session
        TutorTurnResponse secondResponse =
                osmosisTutorService.handleVoiceTurn(deckId, firstSessionId, null, "Next");

        assertEquals(firstSessionId, secondResponse.sessionId());
    }

    @Test
    void handleVoiceTurn_throwsIllegalArgumentException_whenSessionDeckMismatch()
            throws IOException {
        UUID otherDeckId = UUID.randomUUID();
        DeckEntity otherDeck =
                DeckEntity.builder().id(otherDeckId).name("Other Deck").build();

        when(deckRepository.findById(deckId)).thenReturn(Optional.of(deck));
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card1));
        when(spacedRepetitionService.recordReview(any(), anyBoolean())).thenReturn(card1);
        when(spacedRepetitionService.findNextDueCard(deckId)).thenReturn(Optional.of(card2));

        when(chatClient.prompt()).thenReturn(chatClientRequest);
        when(chatClientRequest.advisors(any())).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(callResponseSpec);
        when(callResponseSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn("OK");

        SpeechResponse speechResponse = mock(SpeechResponse.class);
        SpeechResponse.SpeechResult speechResult = mock(SpeechResponse.SpeechResult.class);
        when(speechModel.call(any(SpeechPrompt.class))).thenReturn(speechResponse);
        when(speechResponse.getResult()).thenReturn(speechResult);
        when(speechResult.getOutput()).thenReturn(new byte[] {1, 2, 3});

        TutorTurnResponse firstResponse =
                osmosisTutorService.handleVoiceTurn(deckId, null, null, "Answer");

        when(deckRepository.findById(otherDeckId)).thenReturn(Optional.of(otherDeck));

        assertThrows(
                IllegalArgumentException.class,
                () ->
                        osmosisTutorService.handleVoiceTurn(
                                otherDeckId, firstResponse.sessionId(), null, "Next"));
    }
}
