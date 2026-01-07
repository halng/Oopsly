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

import com.app.osmosis.api.entity.CardEntity;
import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.CardRepository;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.tutor.TutorSession;
import com.app.osmosis.api.viewmodel.TutorTurnResponse;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.audio.speech.SpeechPrompt;
import org.springframework.ai.audio.transcription.AudioTranscriptionPrompt;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemoryStore;
import org.springframework.ai.chat.memory.InMemoryChatMemory;
import org.springframework.ai.chat.memory.MessageChatMemoryAdvisor;
import org.springframework.ai.openai.audio.speech.OpenAiAudioSpeechModel;
import org.springframework.ai.openai.audio.transcription.OpenAiAudioTranscriptionModel;
import org.springframework.ai.openai.metadata.OpenAiAudioResponseMetadata;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Service
public class OsmosisTutorService {
    private static final String SYSTEM_PERSONA =
            "You are a strict but encouraging oral examiner for a spaced-repetition tutoring app. "
                    + "Keep answers under three short sentences. "
                    + "Never speak in lists, markdown, or code. "
                    + "Ask concise questions aloud, listen, then confirm or correct before moving on.";

    private final ChatClient chatClient;
    private final OpenAiAudioTranscriptionModel transcriptionModel;
    private final OpenAiAudioSpeechModel speechModel;
    private final SpacedRepetitionService spacedRepetitionService;
    private final DeckRepository deckRepository;
    private final CardRepository cardRepository;
    private final ChatMemoryStore chatMemoryStore;
    private final Map<UUID, TutorSession> sessionStore = new ConcurrentHashMap<>();

    public OsmosisTutorService(
            ChatClient.Builder chatClientBuilder,
            OpenAiAudioTranscriptionModel transcriptionModel,
            OpenAiAudioSpeechModel speechModel,
            SpacedRepetitionService spacedRepetitionService,
            DeckRepository deckRepository,
            CardRepository cardRepository,
            ChatMemoryStore chatMemoryStore) {
        this.chatClient = chatClientBuilder.defaultSystem(SYSTEM_PERSONA).build();
        this.transcriptionModel = transcriptionModel;
        this.speechModel = speechModel;
        this.spacedRepetitionService = spacedRepetitionService;
        this.deckRepository = deckRepository;
        this.cardRepository = cardRepository;
        this.chatMemoryStore = chatMemoryStore;
    }

    public TutorTurnResponse handleVoiceTurn(
            UUID deckId, UUID sessionId, MultipartFile audioFile, String userText)
            throws IOException {
        DeckEntity deck =
                deckRepository
                        .findById(deckId)
                        .orElseThrow(() -> new NotFoundException("Deck not found"));

        UUID resolvedSessionId = Optional.ofNullable(sessionId).orElseGet(UUID::randomUUID);
        TutorSession session =
                sessionStore.computeIfAbsent(
                        resolvedSessionId,
                        id ->
                                TutorSession.builder()
                                        .sessionId(id)
                                        .deckId(deck.getId())
                                        .lastInteraction(java.time.Instant.now())
                                        .build());

        if (!Objects.equals(session.getDeckId(), deckId)) {
            throw new IllegalArgumentException("Session deck does not match requested deck");
        }

        CardEntity activeCard = resolveActiveCard(session, deckId);
        String transcript = resolveTranscript(audioFile, userText);
        String userPrompt = buildUserPrompt(deck, activeCard, transcript);

        MessageChatMemoryAdvisor memoryAdvisor = buildSessionMemoryAdvisor(resolvedSessionId);
        String tutorReply =
                chatClient
                        .prompt()
                        .advisors(memoryAdvisor)
                        .user(userPrompt)
                        .call()
                        .content();

        boolean likelyCorrect = isLikelyCorrect(tutorReply);
        CardEntity reviewed = spacedRepetitionService.recordReview(activeCard.getId(), likelyCorrect);
        CardEntity nextCard =
                spacedRepetitionService.findNextDueCard(deckId).orElse(reviewed);

        session.setActiveCardId(nextCard.getId());
        session.setLastInteraction(java.time.Instant.now());
        sessionStore.put(resolvedSessionId, session);

        String audioBase64 = synthesizeSpeech(tutorReply);

        return new TutorTurnResponse(
                resolvedSessionId,
                deckId,
                activeCard.getId(),
                activeCard.getPrompt(),
                transcript,
                tutorReply,
                audioBase64,
                reviewed.getDueAt());
    }

    private CardEntity resolveActiveCard(TutorSession session, UUID deckId) {
        if (session.getActiveCardId() != null) {
            return cardRepository
                    .findById(session.getActiveCardId())
                    .orElseThrow(() -> new NotFoundException("Active card missing"));
        }

        return spacedRepetitionService
                .findNextDueCard(deckId)
                .orElseThrow(() -> new NotFoundException("No due cards available"));
    }

    private String resolveTranscript(MultipartFile audioFile, String userText) throws IOException {
        if (audioFile != null && !audioFile.isEmpty()) {
            ByteArrayResource audioResource =
                    new ByteArrayResource(audioFile.getBytes()) {
                        @Override
                        public String getFilename() {
                            return "audio.wav";
                        }
                    };
            var response = transcriptionModel.call(new AudioTranscriptionPrompt(audioResource));
            if (response.getMetadata() instanceof OpenAiAudioResponseMetadata metadata) {
                log.debug(
                        "Transcription model: {} | duration {}", metadata.getModel(), metadata.getDuration());
            }
            return response.getResult().getOutput();
        }
        return userText != null ? userText : "";
    }

    private String buildUserPrompt(DeckEntity deck, CardEntity card, String transcript) {
        return "Deck: "
                + deck.getName()
                + "\nCurrent Card Question: "
                + card.getPrompt()
                + "\nExpected Answer: "
                + card.getAnswer()
                + "\nLearner just said: "
                + (transcript == null ? "" : transcript)
                + "\nFollow the persona: keep it oral, concise, correct mistakes, and move forward.";
    }

    private MessageChatMemoryAdvisor buildSessionMemoryAdvisor(UUID sessionId) {
        return new MessageChatMemoryAdvisor(new InMemoryChatMemory(chatMemoryStore, sessionId.toString()));
    }

    private boolean isLikelyCorrect(String tutorReply) {
        String normalized = tutorReply.toLowerCase();
        return normalized.contains("correct") || normalized.contains("right") || normalized.contains("good job");
    }

    private String synthesizeSpeech(String tutorReply) {
        var speechResponse = speechModel.call(new SpeechPrompt(tutorReply));
        byte[] audioBytes = speechResponse.getResult().getOutput();
        return Base64.getEncoder().encodeToString(audioBytes);
    }
}
