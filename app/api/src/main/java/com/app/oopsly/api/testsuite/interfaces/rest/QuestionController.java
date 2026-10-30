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

package com.app.oopsly.api.testsuite.interfaces.rest;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.testsuite.application.QuestionService;
import com.app.oopsly.api.testsuite.application.vm.BulkQuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
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
@RequestMapping("/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions")
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
                    "Creates a single choice, multiple choice, true/false or fill-in-the-blank"
                            + " question in a test suite")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Question created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid question"),
                @ApiResponse(responseCode = "404", description = "Shelve or test suite not found")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId,
            @Valid @RequestBody QuestionReq requestBody) {
        return this.service.create(shelveId, testSuiteId, requestBody);
    }

    @Operation(
            summary = "Bulk create questions",
            description =
                    "Creates up to 200 questions in a test suite in one call. All questions are"
                            + " validated first; if any is invalid nothing is created")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Questions created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid question"),
                @ApiResponse(responseCode = "404", description = "Shelve or test suite not found")
            })
    @PostMapping("/bulk")
    public ApiRes createBulk(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId,
            @Valid @RequestBody BulkQuestionReq requestBody) {
        return this.service.createBulk(shelveId, testSuiteId, requestBody);
    }

    @Operation(summary = "Update question", description = "Replaces an existing question")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid question"),
                @ApiResponse(responseCode = "404", description = "Question not found")
            })
    @PutMapping("/{id}")
    public ApiRes update(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId,
            @Parameter(description = "Question ID", required = true) @PathVariable UUID id,
            @Valid @RequestBody QuestionReq requestBody) {
        return this.service.update(shelveId, testSuiteId, id, requestBody);
    }

    @Operation(summary = "Get question by ID", description = "Retrieves a question with its key")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Question not found")
            })
    @GetMapping("/{id}")
    public ApiRes getById(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId,
            @Parameter(description = "Question ID", required = true) @PathVariable UUID id) {
        return this.service.getById(shelveId, testSuiteId, id);
    }

    @Operation(summary = "Delete question", description = "Soft deletes a question")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Question soft-deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Question not found")
            })
    @PatchMapping("/{id}")
    public ApiRes deleteById(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId,
            @Parameter(description = "Question ID", required = true) @PathVariable UUID id) {
        return this.service.delete(shelveId, testSuiteId, id);
    }

    @Operation(
            summary = "Get all questions by test suite",
            description = "Lists the questions of a test suite, oldest first, with their keys")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Questions retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Shelve or test suite not found")
            })
    @GetMapping("")
    public ApiRes getAllByTestSuite(
            @Parameter(description = "Shelve ID", required = true) @PathVariable UUID shelveId,
            @Parameter(description = "Test Suite ID", required = true) @PathVariable
                    UUID testSuiteId) {
        return this.service.getAllByTestSuite(shelveId, testSuiteId);
    }
}
