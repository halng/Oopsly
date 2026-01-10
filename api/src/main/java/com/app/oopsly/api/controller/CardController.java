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

import com.app.oopsly.api.service.CardService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.UpdateDifficultyReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/decks/{deckId}/cards")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Card",
        description =
                "Card management APIs for creating, updating, retrieving and deleting cards within"
                        + " decks")
public class CardController {

    private final CardService cardService;

    @Operation(summary = "Create cards", description = "Creates new cards for a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("")
    ApiRes create(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(description = "Card creation request", required = true) @Valid @RequestBody
                    CardReq requestBody) {
        log.info("Creating cards for deck: {}", deckId);
        return cardService.create(deckId, requestBody);
    }

    @Operation(
            summary = "Get all cards by deck",
            description = "Retrieves a paginated list of all cards for a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid pagination parameters"),
                @ApiResponse(responseCode = "404", description = "Deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    ApiRes getAllCardsByDeck(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(description = "Page number (starts from 0)", required = true, example = "0")
                    @RequestParam
                    @Min(value = 0, message = "Page must be greater than or equal to 0") int page,
            @Parameter(description = "Page size", required = true, example = "10")
                    @RequestParam
                    @Min(value = 1, message = "Size must be greater than 0") int size) {
        log.info("Getting all cards for deck: {} with page: {} and size: {}", deckId, page, size);
        return cardService.getAllCardsByDeck(deckId, page, size);
    }

    @Operation(summary = "Update card", description = "Updates an existing card in a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Card or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    ApiRes updateCard(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Card update request", required = true) @Valid @RequestBody
                    CardItemReq requestBody) {
        log.info("Updating card: {} in deck: {}", id, deckId);
        return cardService.updateCard(deckId, id, requestBody);
    }

    @Operation(
            summary = "Get card by ID",
            description = "Retrieves a specific card from a deck by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Card or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    ApiRes getById(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        log.info("Getting card: {} from deck: {}", id, deckId);
        return cardService.getById(deckId, id);
    }

    @Operation(
            summary = "Update card difficulty",
            description = "Updates the difficulty level for multiple cards in a deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Difficulty updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/difficulty")
    ApiRes updateDifficulty(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(description = "List of difficulty update requests", required = true)
                    @Valid @RequestBody
                    List<UpdateDifficultyReq> requestBody) {
        log.info("Updating difficulty for cards in deck: {}", deckId);
        return cardService.updateDifficulty(deckId, requestBody);
    }

    @Operation(summary = "Delete card", description = "Soft deletes a card from a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Card or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    ApiRes deleteById(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID deckId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        log.info("Deleting card: {} from deck: {}", id, deckId);
        return cardService.delete(deckId, id);
    }
}
