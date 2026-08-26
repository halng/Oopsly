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

package com.app.oopsly.api.ai.application;

import com.app.oopsly.api.ai.application.vm.GenerateCardsReq;
import com.app.oopsly.api.ai.application.vm.GeneratedCard;
import com.app.oopsly.api.ai.domain.AiPrompts;
import com.app.oopsly.api.ai.infrastructure.AiCardGenerator;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiCardGenerationServiceImpl implements AiCardGenerationService {

    private final AiCardGenerator aiCardGenerator;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.AI, fallbackMethod = "generateCardsFallback")
    public ApiRes generateCards(GenerateCardsReq request) {
        if ((request.topic() == null || request.topic().isBlank())
                && (request.notes() == null || request.notes().isBlank())) {
            throw new ValidationException(ApiMessages.AI_TOPIC_REQUIRED);
        }

        int count = request.count() == null ? AiPrompts.DEFAULT_CARD_COUNT : request.count();
        List<GeneratedCard> cards =
                aiCardGenerator.generate(request.topic(), request.notes(), count);

        log.info("Generated {} flashcards with AI", cards.size());
        return ApiRes.success(ApiMessages.AI_CARDS_GENERATED, cards);
    }

    /**
     * When the AI provider is down we still return usable starter cards so the learner is never
     * blocked, together with a clear explanation.
     */
    @SuppressWarnings("unused")
    private ApiRes generateCardsFallback(GenerateCardsReq request, Throwable throwable) {
        if (throwable instanceof ValidationException validationException) {
            throw validationException;
        }
        log.error("AI generation degraded: {}", throwable.getMessage(), throwable);
        return ApiRes.success(
                ApiMessages.AI_UNAVAILABLE,
                aiCardGenerator.heuristicCards(request == null ? null : request.topic()));
    }
}
