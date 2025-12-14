/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.controller;

import com.app.osmosis.api.service.OTPService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.OTPReq;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/otp")
public class OTPController {
    private final String EMAIL_RE = "^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$";
    private final OTPService otpService;

    public OTPController(OTPService otpService) {
        this.otpService = otpService;
    }

    @PostMapping()
    ApiRes createOTP(
            @RequestParam("email") @Pattern(regexp = EMAIL_RE, message = "Invalid Email Format") String email) {
        return otpService.sendOTP(email);
    }

    @PostMapping("/validate")
    ApiRes validateOTP(@Valid @RequestBody OTPReq otpReq) {
        return otpService.verifyOTP(otpReq);
    }
}
