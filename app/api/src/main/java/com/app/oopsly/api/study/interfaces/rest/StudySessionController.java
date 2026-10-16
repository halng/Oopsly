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

package com.app.oopsly.api.study.interfaces.rest;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.study.application.StudySessionService;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionStartReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/shelves/{shelfId}/subjects/{subjectId}/study-sessions")
@RequiredArgsConstructor
@Tag(name = "Study Session", description = "Learn / Match session results and XP")
public class StudySessionController {

    private final StudySessionService studySessionService;

    @Operation(summary = "Start a server-tracked study session")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Session started",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Shelf or subject not found")
            })
    @PostMapping("/start")
    public ApiRes start(
            @Parameter(description = "Shelf ID", required = true) @PathVariable UUID shelfId,
            @Parameter(description = "Subject ID", required = true) @PathVariable UUID subjectId,
            @Valid @RequestBody StudySessionStartReq request) {
        return studySessionService.start(shelfId, subjectId, request);
    }

    @Operation(
            summary = "Record a study session",
            description =
                    "Stores a finished Learn or Match session and awards XP computed on the"
                            + " server. FSRS scheduling is not affected.")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "201",
                        description = "Session recorded",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "404", description = "Shelf or subject not found")
            })
    @PostMapping("")
    public ApiRes record(
            @Parameter(description = "Shelf ID", required = true) @PathVariable UUID shelfId,
            @Parameter(description = "Subject ID", required = true) @PathVariable UUID subjectId,
            @Valid @RequestBody StudySessionReq request) {
        return studySessionService.record(shelfId, subjectId, request);
    }
}
