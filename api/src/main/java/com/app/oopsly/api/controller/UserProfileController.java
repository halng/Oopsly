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

import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.UpdateProfileReq;
import com.app.oopsly.api.viewmodel.UpdateSettingsReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "User Profile", description = "User profile and settings management APIs")
public class UserProfileController {

    private final UserService userService;

    @Operation(
            summary = "Get user profile",
            description = "Retrieves the current user's profile and settings")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Profile retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "404", description = "Profile not found"),
                @ApiResponse(responseCode = "401", description = "Unauthorized"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/profile")
    public ApiRes getProfile() {
        return userService.getProfile();
    }

    @Operation(
            summary = "Update user profile",
            description = "Updates the current user's profile information")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Profile updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "401", description = "Unauthorized"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/profile")
    public ApiRes updateProfile(
            @Parameter(description = "Profile update request", required = true) @Valid @RequestBody
                    UpdateProfileReq request) {
        return userService.updateProfile(request);
    }

    @Operation(
            summary = "Update user settings",
            description = "Updates the current user's application settings")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Settings updated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "401", description = "Unauthorized"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PatchMapping("/settings")
    public ApiRes updateSettings(
            @Parameter(description = "Settings update request", required = true) @Valid @RequestBody
                    UpdateSettingsReq request) {
        return userService.updateSettings(request);
    }
}
