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

import com.app.oopsly.api.service.ShelfService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.ShelfReq;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/shelves")
@Tag(
        name = "Shelf",
        description =
                "Shelf management APIs for creating, updating, retrieving and deleting shelfs")
public class ShelfController {
    private final ShelfService service;

    public ShelfController(ShelfService service) {
        this.service = service;
    }

    @Operation(
            summary = "Create shelf",
            description = "Creates a new shelf with the provided information")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Shelf created successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(description = "Shelf creation request", required = true) @Valid @RequestBody
                    ShelfReq requestBody) {
        return this.service.create(requestBody);
    }

    @Operation(summary = "Update shelf", description = "Updates an existing shelf by ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Shelve updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body or ID"),
                @ApiResponse(responseCode = "404", description = "Shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PutMapping("/{id}")
    public ApiRes update(
            @Parameter(description = "Shelve update request", required = true) @Valid @RequestBody
                    ShelfReq requestBody,
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID id) {
        return this.service.update(requestBody, id);
    }

    @Operation(
            summary = "Get shelf by ID",
            description = "Retrieves a shelf by its unique identifier")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Shelve retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/{id}")
    public ApiRes getById(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID id) {
        return this.service.getById(id);
    }

    @Operation(summary = "Delete shelf", description = "Soft deletes a shelf by ID")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Shelve deleted successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Shelve not found"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/{id}")
    public ApiRes deleteById(
            @Parameter(
                            description = "Shelve ID",
                            required = true,
                            example = "123e4567-e89b-12d3-a456-426614174000")
                    @PathVariable
                    UUID id) {
        return this.service.delete(id);
    }

    @Operation(
            summary = "Get all shelves",
            description = "Retrieves a paginated list of all shelves")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Shelves retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid pagination parameters"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("")
    public ApiRes getAll(
            @Parameter(description = "Page number", required = true, example = "0")
                    @RequestParam
                    @Min(value = 0, message = "Page must be greater or equal 0") int page,
            @Parameter(description = "Page size", required = true, example = "10")
                    @RequestParam
                    @Min(value = 1, message = "Size must be greater than 0") int size) {
        return this.service.getAll(page, size);
    }
}
