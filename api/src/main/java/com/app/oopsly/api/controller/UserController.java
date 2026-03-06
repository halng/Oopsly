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
import com.app.oopsly.api.viewmodel.RefreshTokenReq;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
@Tag(name = "Users", description = "User management APIs")
public class UserController {

    private final UserService userService;

    @Operation(
            summary = "Refresh Access Token",
            description =
                    "Generates a new access token and refresh token using a valid refresh token")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Token refreshed successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "400",
                        description = "Invalid input - validation failed"),
                @ApiResponse(
                        responseCode = "401",
                        description = "Unauthorized - invalid or expired refresh token"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/refresh-token")
    public ApiRes refreshToken(
            @Parameter(
                            description =
                                    "Refresh token request containing refresh token, user email,"
                                            + " and user ID",
                            required = true)
                    @Valid @RequestBody
                    RefreshTokenReq refreshTokenReq) {
        log.debug("Received refresh token request for user: {}", refreshTokenReq.userEmail());
        return userService.refreshToken(refreshTokenReq);
    }

    @Operation(
            summary = "Logout",
            description = "Logs out the current user by invalidating their refresh token")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Logged out successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(
                        responseCode = "401",
                        description = "Unauthorized - user not authenticated"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/logout")
    public ApiRes logout() {
        log.debug("Received logout request");
        return userService.logout();
    }

    @Operation(
            summary = "Validate access token",
            description =
                    "Validates the current JWT access token. Returns 200 if valid, 401 if invalid"
                            + " or expired.")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Token is valid",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "401", description = "Invalid or expired token"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @GetMapping("/validate")
    public ApiRes validate() {
        return userService.validateToken();
    }
}
