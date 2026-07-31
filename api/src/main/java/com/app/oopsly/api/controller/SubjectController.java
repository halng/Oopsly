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
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
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
@RequestMapping("/shelves/{shelfId}/subjects")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Subject",
        description =
                "Subject management APIs for creating, updating, retrieving and deleting"
                        + " subjects within shelves")
public class SubjectController {

    private final SubjectService subjectService;

    @Operation(
            summary = "Create subject",
            description = "Creates a new subject within a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Subject created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(description = "Subject creation request", required = true)
                    @Valid @RequestBody
                    SubjectReq requestBody) {
        log.info("Creating subject for shelve: {}", shelfId);
        return subjectService.create(shelfId, requestBody);
    }

    @Operation(
            summary = "Get all subjects by shelve",
            description = "Retrieves a paginated list of all subjects for a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Subjects retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid pagination parameters"),
                @ApiResponse(responseCode = "404", description = "Shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    public ApiRes getAllByShelve(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(description = "Page number (starts from 0)", required = true, example = "0")
                    @RequestParam
                    @Min(value = 0, message = "Page must be greater than or equal to 0") int page,
            @Parameter(description = "Page size", required = true, example = "10")
                    @RequestParam
                    @Min(value = 1, message = "Size must be greater than 0") int size) {
        log.info(
                "Getting all subjects for shelf: {} with page: {} and size: {}",
                shelfId,
                page,
                size);
        return subjectService.getAllByShelve(shelfId, page, size);
    }

    @Operation(
            summary = "Update subject",
            description = "Updates an existing subject in a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Subject updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Subject or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    public ApiRes update(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Subject update request", required = true) @Valid @RequestBody
                    SubjectReq requestBody) {
        log.info("Updating subject: {} in shelve: {}", id, shelfId);
        return subjectService.update(shelfId, id, requestBody);
    }

    @PutMapping("/{id}/settings")
    public ApiRes updateSetting(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Subject Setting update request", required = true)
                    @Valid @RequestBody
                    SubjectSettingReq requestBody) {
        log.info("Updating Setting for subject: {} in shelve: {}", id, shelfId);
        return subjectService.updateSetting(shelfId, id, requestBody);
    }

    @Operation(
            summary = "Get subject by ID",
            description = "Retrieves a specific subject from a shelve by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Subject retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Subject or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    public ApiRes getById(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        log.info("Getting subject: {} from shelve: {}", id, shelfId);
        return subjectService.getById(shelfId, id);
    }

    @Operation(
            summary = "Delete subject",
            description = "Soft deletes a subject and all its cards from a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Subject deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Subject or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    public ApiRes delete(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelfId,
            @Parameter(
                            description = "Subject ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        log.info("Deleting subject: {} from shelve: {}", id, shelfId);
        return subjectService.delete(shelfId, id);
    }
}
