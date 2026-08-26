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

package com.app.oopsly.api.leaderboard.interfaces.rest;

import com.app.oopsly.api.leaderboard.application.LeaderboardService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/leaderboard")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Leaderboard",
        description = "Global leaderboard APIs ranking learners by earned XP and study streaks")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @Operation(
            summary = "Global leaderboard",
            description =
                    "Retrieves the top learners ordered by XP, including their rank, league and a"
                            + " flag marking the authenticated user")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Leaderboard retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid limit parameter"),
                @ApiResponse(responseCode = "401", description = "Unauthenticated"),
                @ApiResponse(responseCode = "503", description = "Leaderboard service degraded")
            })
    @GetMapping("")
    public ApiRes getGlobalLeaderboard(
            @Parameter(description = "Maximum number of rows to return", example = "50")
                    @RequestParam(defaultValue = "50")
                    @Min(1) @Max(200) int limit) {
        log.info("Fetching global leaderboard with limit {}", limit);
        return leaderboardService.getGlobalLeaderboard(limit);
    }
}
