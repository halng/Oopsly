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

import com.app.oopsly.api.service.QuestionService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test-suites/{testSuiteId}/questions")
@Tag(
        name = "Question",
        description =
                "Question management APIs for creating, updating, retrieving and deleting"
                        + " questions within test suites")
public class QuestionController {
    private final QuestionService service;

    public QuestionController(QuestionService service) {
        this.service = service;
    }

    @Operation(
            summary = "Create question",
            description =
                    "Creates a new question within a specific test suite with type-specific"
                            + " metadata validation")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Question created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "400",
                        description = "Invalid request body or metadata validation failed"),
                @ApiResponse(responseCode = "404", description = "Test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID testSuiteId,
            @Parameter(description = "Question creation request", required = true)
                    @Valid @RequestBody
                    QuestionReq requestBody) {
        return this.service.create(testSuiteId, requestBody);
    }

    @Operation(
            summary = "Update question",
            description = "Updates an existing question in a specific test suite")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "400",
                        description = "Invalid request body or metadata validation failed"),
                @ApiResponse(
                        responseCode = "404",
                        description = "Question or test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    public ApiRes update(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID testSuiteId,
            @Parameter(
                            description = "Question ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Question update request", required = true) @Valid @RequestBody
                    QuestionReq requestBody) {
        return this.service.update(testSuiteId, id, requestBody);
    }

    @Operation(
            summary = "Get question by ID",
            description = "Retrieves a specific question from a test suite by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Question or test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    public ApiRes getById(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID testSuiteId,
            @Parameter(
                            description = "Question ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        return this.service.getById(testSuiteId, id);
    }

    @Operation(
            summary = "Delete question",
            description = "Soft deletes a question from a specific test suite")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question soft-deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "404",
                        description = "Question or test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    public ApiRes deleteById(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID testSuiteId,
            @Parameter(
                            description = "Question ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        return this.service.delete(testSuiteId, id);
    }

    @Operation(
            summary = "Get all questions by test suite",
            description = "Retrieves a list of all questions for a specific test suite")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Questions retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    public ApiRes getAllByTestSuite(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID testSuiteId) {
        return this.service.getAllByTestSuite(testSuiteId);
    }
}
