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

import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/shelves/{shelveId}/subjects")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Collection",
        description =
                "Collection management APIs for creating, updating, retrieving and deleting"
                        + " collections within decks")
public class SubjectController {

    private final SubjectService subjectService;

    @Operation(
            summary = "Create collection",
            description = "Creates a new collection within a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Collection created successfully",
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
                    UUID shelveId,
            @Parameter(description = "Collection creation request", required = true)
                    @Valid @RequestBody
                    SubjectReq requestBody) {
        log.info("Creating collection for deck: {}", shelveId);
        return subjectService.create(shelveId, requestBody);
    }

    @Operation(
            summary = "Get all collections by deck",
            description = "Retrieves a paginated list of all collections for a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Collections retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid pagination parameters"),
                @ApiResponse(responseCode = "404", description = "Deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    ApiRes getAllByShelve(
            @Parameter(
                            description = "Deck ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(description = "Page number (starts from 0)", required = true, example = "0")
                    @RequestParam
                    @Min(value = 0, message = "Page must be greater than or equal to 0") int page,
            @Parameter(description = "Page size", required = true, example = "10")
                    @RequestParam
                    @Min(value = 1, message = "Size must be greater than 0") int size) {
        log.info(
                "Getting all collections for deck: {} with page: {} and size: {}",
                shelveId,
                page,
                size);
        return subjectService.getAllByShelve(shelveId, page, size);
    }

    @Operation(
            summary = "Update collection",
            description = "Updates an existing collection in a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Collection updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Collection or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    ApiRes update(
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
                    UUID id,
            @Parameter(description = "Collection update request", required = true)
                    @Valid @RequestBody
                    SubjectReq requestBody) {
        log.info("Updating collection: {} in deck: {}", id, shelveId);
        return subjectService.update(shelveId, id, requestBody);
    }

    @Operation(
            summary = "Get collection by ID",
            description = "Retrieves a specific collection from a deck by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Collection retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Collection or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    ApiRes getById(
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
                    UUID id) {
        log.info("Getting collection: {} from deck: {}", id, shelveId);
        return subjectService.getById(shelveId, id);
    }

    @Operation(
            summary = "Delete collection",
            description = "Soft deletes a collection and all its cards from a specific deck")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Collection deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Collection or deck not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    ApiRes delete(
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
                    UUID id) {
        log.info("Deleting collection: {} from deck: {}", id, shelveId);
        return subjectService.delete(shelveId, id);
    }
}
