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

import com.app.oopsly.api.service.OTPService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.OTPReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/otp")
@Tag(
        name = "OTP",
        description = "OTP management APIs for generating and validating one-time passwords")
public class OTPController {
    private final String EMAIL_RE = "^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$";
    private final OTPService otpService;

    public OTPController(OTPService otpService) {
        this.otpService = otpService;
    }

    @Operation(
            summary = "Generate OTP",
            description = "Generates and sends a one-time password to the specified email address")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "OTP sent successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid email format"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping()
    public ApiRes createOTP(
            @Parameter(
                            description = "Email address to send OTP",
                            required = true,
                            example = "user@example.com")
                    @RequestParam("email")
                    @Pattern(regexp = EMAIL_RE, message = "Invalid Email Format") String email) {
        return otpService.sendOTP(email);
    }

    @Operation(
            summary = "Validate OTP",
            description = "Verifies the one-time password for the given email address")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "OTP validated successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "400", description = "Invalid OTP or request format"),
                @ApiResponse(responseCode = "401", description = "OTP expired or incorrect"),
                @ApiResponse(responseCode = "500", description = "Internal server error")
            })
    @PostMapping("/validate")
    public ApiRes validateOTP(
            @Parameter(
                            description = "OTP validation request containing email and OTP code",
                            required = true,
                            example = "111111")
                    @Valid @RequestBody
                    OTPReq otpReq) {
        return otpService.verifyOTP(otpReq);
    }
}
