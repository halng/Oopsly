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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test-suites")
@Tag(
        name = "Test Suite Cards",
        description = "Retrieve cards for a test suite (M1: card-based preset / take test)")
public class TestSuiteCardsController {

    private final CardService cardService;

    public TestSuiteCardsController(CardService cardService) {
        this.cardService = cardService;
    }

    @Operation(
            summary = "Get cards for test suite",
            description =
                    "Returns all non-deleted cards from subjects linked to this test suite. Used"
                            + " for \"Taking a test\" (card-based preset).")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Cards retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Test suite not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{testSuiteId}/cards")
    public ApiRes getCards(
            @Parameter(
                            description = "Test Suite ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174001")
                    @PathVariable
                    UUID testSuiteId) {
        return cardService.getCardsByTestSuite(testSuiteId);
    }
}
