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

package com.app.oopsly.api.ai.interfaces.rest;

import com.app.oopsly.api.ai.application.AiCardGenerationService;
import com.app.oopsly.api.ai.application.vm.GenerateCardsReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "AI",
        description =
                "AI assisted flashcard generation from a topic or raw study notes, with a"
                        + " heuristic fallback when the provider is unavailable")
public class AiCardGenerationController {

    private final AiCardGenerationService aiCardGenerationService;

    @Operation(
            summary = "Generate flashcards",
            description =
                    "Generates high-yield active recall flashcards from a topic and/or study"
                            + " notes. If the AI provider is degraded, a starter deck is returned"
                            + " with an explanatory message instead of an error")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Flashcards generated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Topic or notes are required"),
                @ApiResponse(responseCode = "401", description = "Unauthenticated")
            })
    @PostMapping("/generate-cards")
    public ApiRes generateCards(
            @Parameter(description = "Generation request", required = true) @Valid @RequestBody
                    GenerateCardsReq requestBody) {
        log.info("Generating flashcards for topic {}", requestBody.topic());
        return aiCardGenerationService.generateCards(requestBody);
    }
}
