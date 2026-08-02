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
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/shelves/{shelveId}/subjects/{subjectId}/cards")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Card",
        description =
                "Card management APIs for creating, updating, retrieving and deleting cards within"
                        + " subjects")
public class CardController {

    private final CardService cardService;

    @Operation(summary = "Create cards", description = "Creates new cards for a specific subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(description = "Card creation request", required = true) @Valid @RequestBody
                    CardReq requestBody) {
        log.info("Creating cards for subject: {} in shelve: {}", subjectId, shelveId);
        return cardService.create(shelveId, subjectId, requestBody);
    }

    @Operation(
            summary = "Get all cards by subject",
            description = "Retrieves a paginated list of all cards for a specific subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid pagination parameters"),
                @ApiResponse(responseCode = "404", description = "Subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    public ApiRes getAllCardsBySubject(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(description = "Page number (starts from 0)", required = true, example = "0")
                    @RequestParam
                    int page,
            @Parameter(description = "Page size", required = true, example = "10") @RequestParam
                    int size) {
        if (page < 0 || size < 1) {
            return ApiRes.badRequest("Invalid pagination parameters");
        }
        log.info(
                "Getting all cards for subject: {} in shelve: {} with page: {} and size: {}",
                subjectId,
                shelveId,
                page,
                size);
        return cardService.getAllCardsBySubject(shelveId, subjectId, page, size);
    }

    @Operation(
            summary = "Update card",
            description = "Updates an existing card in a specific subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Card or subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    public ApiRes updateCard(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174002")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Card update request", required = true) @Valid @RequestBody
                    CardItemReq requestBody) {
        log.info("Updating card: {} in subject: {} in shelve: {}", id, subjectId, shelveId);
        return cardService.updateCard(shelveId, subjectId, id, requestBody);
    }

    @Operation(
            summary = "Get card by ID",
            description = "Retrieves a specific card from a subject by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Card or subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    public ApiRes getById(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174002")
                    @PathVariable
                    UUID id) {
        log.info("Getting card: {} from subject: {} in shelve: {}", id, subjectId, shelveId);
        return cardService.getById(shelveId, subjectId, id);
    }

    @Operation(
            summary = "Update card difficulty",
            description = "Updates the difficulty level for multiple cards in a subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Difficulty updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/difficulty")
    public ApiRes updateDifficulty(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(description = "List of difficulty update requests", required = true)
                    @Valid @RequestBody
                    List<UpdateDifficultyReq> requestBody) {
        log.info("Updating difficulty for cards in subject: {} in shelve: {}", subjectId, shelveId);
        return cardService.updateDifficulty(shelveId, subjectId, requestBody);
    }

    @Operation(
            summary = "Get due cards",
            description = "Retrieves cards due for review in a specific subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Due cards retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Subject not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/due")
    public ApiRes getDueCards(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(description = "Maximum number of cards to return", example = "20")
                    @RequestParam(defaultValue = "20")
                    int limit) {
        log.info(
                "Getting due cards for subject: {} in shelve: {} with limit: {}",
                subjectId,
                shelveId,
                limit);
        return cardService.getDueCards(shelveId, subjectId, limit);
    }

    @Operation(
            summary = "Delete card",
            description = "Soft deletes a card from a specific collection")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Card deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Card or collection not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    public ApiRes deleteById(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Collection ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID subjectId,
            @Parameter(
                            description = "Card ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174002")
                    @PathVariable
                    UUID id) {
        log.info("Deleting card: {} from collection: {} in deck: {}", id, subjectId, shelveId);
        return cardService.delete(shelveId, subjectId, id);
    }
}
