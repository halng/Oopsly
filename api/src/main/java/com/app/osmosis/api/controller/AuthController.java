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

import com.app.osmosis.api.service.AuthService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.auth.SignInRequest;
import com.app.osmosis.api.viewmodel.auth.SignUpRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ApiRes signUp(@Valid @RequestBody SignUpRequest signUpRequest) {
        return authService.signUp(signUpRequest);
    }

    @PostMapping("/signin")
    public ApiRes signIn(@Valid @RequestBody SignInRequest signInRequest) {
        return this.authService.signIn(signInRequest);
    }

    @PostMapping("/signin/{provider}")
    public ApiRes signInWithProvider(
            @PathVariable String provider, @RequestBody Map<String, String> payload) {
        return switch (provider.toLowerCase()) {
            case "google" -> this.authService.signInWithGoogle(payload);
            default -> ApiRes.error("Unsupported provider: " + provider);
        };
    }
}
