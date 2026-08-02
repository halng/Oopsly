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

import com.app.oopsly.api.service.TestSuiteService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
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
@RequestMapping("/shelves/{shelveId}/test-suites")
@Tag(
        name = "Test Suite",
        description =
                "Test Suite management APIs for creating, updating, retrieving and deleting test"
                        + " suites within shelves")
public class TestSuiteController {
    private final TestSuiteService service;

    public TestSuiteController(TestSuiteService service) {
        this.service = service;
    }

    @Operation(
            summary = "Create test suite",
            description = "Creates a new test suite within a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Test suite created successfully",
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
                    UUID shelveId,
            @Parameter(description = "Test suite creation request", required = true)
                    @Valid @RequestBody
                    TestSuiteReq requestBody) {
        return this.service.create(shelveId, requestBody);
    }

    @Operation(
            summary = "Update test suite",
            description = "Updates an existing test suite in a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Test suite updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Test suite or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    public ApiRes update(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id,
            @Parameter(description = "Test suite update request", required = true)
                    @Valid @RequestBody
                    TestSuiteReq requestBody) {
        return this.service.update(shelveId, id, requestBody);
    }

    @Operation(
            summary = "Get test suite by ID",
            description = "Retrieves a specific test suite from a shelve by its ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Test suite retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Test suite or shelve not found"),
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
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        return this.service.getById(shelveId, id);
    }

    @Operation(
            summary = "Delete test suite",
            description = "Soft deletes a test suite and all its questions from a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Test suite soft-deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Test suite or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    public ApiRes deleteById(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        return this.service.delete(shelveId, id);
    }

    @Operation(
            summary = "Get all test suites by shelve",
            description = "Retrieves a list of all test suites for a specific shelve")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Test suites retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
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
                    UUID shelveId) {
        return this.service.getAllByShelve(shelveId);
    }

    @Operation(
            summary = "Auto-generate test suite",
            description = "Auto-generates a test suite from cards in a given subject")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Test suite auto-generated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Subject or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/auto-generate")
    public ApiRes autoGenerate(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(description = "Subject ID", required = true) @RequestParam UUID subjectId,
            @Parameter(description = "Number of questions", example = "10")
                    @RequestParam(defaultValue = "10")
                    int numQuestions) {
        return this.service.autoGenerate(shelveId, subjectId, numQuestions);
    }

    @Operation(
            summary = "Run test preset",
            description =
                    "Returns flashcards matching this suite's linked subjects and selection rules"
                            + " (read-only snapshot for a practice session)")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards resolved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Test suite or shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/{id}/run")
    public ApiRes runPreset(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID shelveId,
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID id) {
        return this.service.run(shelveId, id);
    }
}
