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

import com.app.osmosis.api.viewmodel.ApiRes;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {

  @GetMapping("/health")
  public String health() {
    return "OK";
  }

  @GetMapping("/user")
  public ApiRes authWithGoogle(@AuthenticationPrincipal OAuth2User principal) {
    return ApiRes.ok("Success", principal.getAttributes());
  }

  @PostMapping("onboard")
  public ApiRes onboardUser(@AuthenticationPrincipal OAuth2User principal) {
    // Onboarding logic here
    return ApiRes.ok("User onboarded", principal.getAttributes());
  }
}
