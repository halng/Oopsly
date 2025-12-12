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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.entity.AuthProvider;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.UserRepository;
import com.app.osmosis.api.service.AuthService;
import com.app.osmosis.api.service.GoogleAuthService;
import com.app.osmosis.api.service.JwtService;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.auth.AuthRes;
import com.app.osmosis.api.viewmodel.auth.SignInRequest;
import com.app.osmosis.api.viewmodel.auth.SignUpRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleAuthService googleAuthService;
    private final JwtService jwtService;

    public AuthServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            GoogleAuthService googleAuthService,
            JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleAuthService = googleAuthService;
        this.jwtService = jwtService;
    }

    @Override
    public ApiRes signUp(SignUpRequest signUpRequest) {
        if (this.userRepository.findByEmail(signUpRequest.email()).isPresent()) {
            return ApiRes.conflict("Email already in use");
        }

        String encodedPassword = passwordEncoder.encode(signUpRequest.password());

        User user =
                User.builder()
                        .authProvider(AuthProvider.LOCAL)
                        .email(signUpRequest.email())
                        .hashedPassword(encodedPassword)
                        .name(signUpRequest.name())
                        .build();

        User savedUser = this.userRepository.save(user);
        String token = jwtService.generateToken(savedUser);

        return ApiRes.created(
                "User created successfully", new AuthRes(token, AuthProvider.LOCAL.name()));
    }

    @Override
    public ApiRes signIn(SignInRequest request) {
        User user =
                this.userRepository
                        .findByEmail(request.email())
                        .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getAuthProvider() == AuthProvider.LOCAL
                && user.getHashedPassword() != null
                && passwordEncoder.matches(request.password(), user.getHashedPassword())) {
            String token = jwtService.generateToken(user);
            return ApiRes.ok(
                    "Sign in successful", new AuthRes(token, user.getAuthProvider().name()));
        }

        return ApiRes.unauthorized("Invalid credentials");
    }

    @Override
    public ApiRes signInWithProvider(Map<String, String> payload) {
        String authToken = payload.get("token");
        if (authToken == null || authToken.isEmpty()) {
            return ApiRes.unauthorized("Missing authentication token");
        }

        GoogleIdToken.Payload verifiedPayload = this.googleAuthService.verify(authToken);

        if (verifiedPayload != null) {
            String email = verifiedPayload.getEmail();
            User user =
                    this.userRepository
                            .findByEmail(email)
                            .orElseGet(
                                    () -> {
                                        // Create new user if not exists
                                        User newUser =
                                                User.builder()
                                                        .authProvider(AuthProvider.GOOGLE)
                                                        .email(email)
                                                        .name((String) verifiedPayload.get("name"))
                                                        .pictureUrl(
                                                                (String)
                                                                        verifiedPayload.get(
                                                                                "picture"))
                                                        .build();
                                        return this.userRepository.save(newUser);
                                    });

            String token = jwtService.generateToken(user);
            return ApiRes.ok(
                    "Sign in successful",
                    new AuthRes(token, AuthProvider.GOOGLE.name()));
        }

        return ApiRes.unauthorized("Invalid authentication token");
    }
}
