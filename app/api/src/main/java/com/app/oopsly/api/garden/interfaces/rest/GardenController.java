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

package com.app.oopsly.api.garden.interfaces.rest;

import com.app.oopsly.api.garden.application.GardenService;
import com.app.oopsly.api.garden.application.vm.CompletePomodoroReq;
import com.app.oopsly.api.garden.application.vm.PlantSeedReq;
import com.app.oopsly.api.garden.application.vm.UnlockPlotReq;
import com.app.oopsly.api.garden.application.vm.WaterTreeReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/garden")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Garden",
        description =
                "Study garden APIs for growing the learner's forest: plots, seeds, watering and"
                        + " Pomodoro focus sessions rewards")
public class GardenController {

    private final GardenService gardenService;

    @Operation(
            summary = "Get my garden",
            description =
                    "Retrieves the whole garden state of the authenticated user (plots, planted"
                            + " trees, currencies, seed inventory, forest level and weather)."
                            + " Creates a starter garden on first access")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Garden retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "401", description = "Unauthenticated"),
                @ApiResponse(responseCode = "503", description = "Garden service degraded")
            })
    @GetMapping("")
    public ApiRes getGarden() {
        log.info("Fetching garden of current user");
        return gardenService.getGarden();
    }

    @Operation(
            summary = "Plant a seed",
            description =
                    "Plants a seed from the inventory on an unlocked and empty land plot of the"
                            + " garden")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "201", description = "Seed planted successfully"),
                @ApiResponse(
                        responseCode = "400",
                        description = "Plot locked, plot occupied or seed missing"),
                @ApiResponse(responseCode = "404", description = "Land plot not found"),
                @ApiResponse(responseCode = "503", description = "Garden service degraded")
            })
    @PostMapping("/plants")
    public ApiRes plantSeed(
            @Parameter(description = "Plant seed request", required = true) @Valid @RequestBody
                    PlantSeedReq requestBody) {
        log.info("Planting {} on plot {}", requestBody.species(), requestBody.plotIndex());
        return gardenService.plantSeed(requestBody);
    }

    @Operation(
            summary = "Water a plant",
            description =
                    "Spends dew drops to water a plant, increasing its water level and growth"
                            + " progress, possibly advancing its stage")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Plant watered successfully"),
                @ApiResponse(responseCode = "400", description = "Not enough dew drops"),
                @ApiResponse(responseCode = "404", description = "Plant not found"),
                @ApiResponse(responseCode = "503", description = "Garden service degraded")
            })
    @PostMapping("/plants/water")
    public ApiRes waterTree(
            @Parameter(description = "Water plant request", required = true) @Valid @RequestBody
                    WaterTreeReq requestBody) {
        log.info("Watering plant {}", requestBody.treeId());
        return gardenService.waterTree(requestBody);
    }

    @Operation(
            summary = "Unlock a land plot",
            description = "Spends forest coins to unlock an additional land plot in the garden")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Plot unlocked successfully"),
                @ApiResponse(responseCode = "400", description = "Not enough forest coins"),
                @ApiResponse(responseCode = "404", description = "Land plot not found"),
                @ApiResponse(responseCode = "503", description = "Garden service degraded")
            })
    @PostMapping("/plots/unlock")
    public ApiRes unlockPlot(
            @Parameter(description = "Unlock plot request", required = true) @Valid @RequestBody
                    UnlockPlotReq requestBody) {
        log.info("Unlocking plot {}", requestBody.plotIndex());
        return gardenService.unlockPlot(requestBody);
    }

    @Operation(
            summary = "Complete a Pomodoro session",
            description =
                    "Records a finished focus session and grants XP, growth points, dew drops,"
                            + " sunlight orbs, forest coins and a seed reward")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Session recorded and rewarded"),
                @ApiResponse(responseCode = "400", description = "Invalid session payload"),
                @ApiResponse(responseCode = "503", description = "Garden service degraded")
            })
    @PostMapping("/pomodoro/complete")
    public ApiRes completePomodoro(
            @Parameter(description = "Completed Pomodoro session", required = true)
                    @Valid @RequestBody
                    CompletePomodoroReq requestBody) {
        log.info("Completing Pomodoro session of {} minutes", requestBody.focusDurationMinutes());
        return gardenService.completePomodoroSession(requestBody);
    }
}
