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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.verify;

import com.app.osmosis.api.entity.AuthProvider;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.exception.NotFoundException;
import com.app.osmosis.api.repository.UserRepository;
import com.app.osmosis.api.service.impl.AuthServiceImpl;
import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.auth.AuthRes;
import com.app.osmosis.api.viewmodel.auth.SignInRequest;
import com.app.osmosis.api.viewmodel.auth.SignUpRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock UserRepository userRepository;

    @Mock PasswordEncoder passwordEncoder;

    @Mock GoogleAuthService googleAuthService;

    @Mock JwtService jwtService;

    @Captor ArgumentCaptor<User> userCaptor;

    @InjectMocks AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        // ensure fresh mocks / injectMocks created by MockitoExtension
    }

    @Test
    void givenSignUp_whenEmailAlreadyExists_thenReturnConflictAndDoNotSaveOrGenerateToken() {
        SignUpRequest req = new SignUpRequest("alice@example.com", "pwd", "Alice");

        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(new User()));

        ApiRes res = authService.signUp(req);

        assertNotNull(res);
        verify(userRepository).findByEmail(req.email());
        verify(userRepository, never()).save(any());
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void givenSignUp_whenNewEmail_thenSaveUserWithEncodedPasswordAndGenerateToken() {
        SignUpRequest req = new SignUpRequest("bob@example.com", "plain", "Bob");
        String encoded = "encoded-plain";
        User savedUser =
                User.builder()
                        .email(req.email())
                        .name(req.name())
                        .authProvider(AuthProvider.LOCAL)
                        .hashedPassword(encoded)
                        .build();

        when(userRepository.findByEmail(req.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(req.password())).thenReturn(encoded);
        when(userRepository.save(any())).thenReturn(savedUser);
        when(jwtService.generateToken(savedUser)).thenReturn("jwt-token");

        ApiRes res = authService.signUp(req);

        assertNotNull(res);
        verify(passwordEncoder).encode(req.password());
        verify(userRepository).save(userCaptor.capture());
        User created = userCaptor.getValue();
        assertEquals(req.email(), created.getEmail());
        assertEquals(encoded, created.getHashedPassword());
        assertEquals(AuthProvider.LOCAL, created.getAuthProvider());
        verify(jwtService).generateToken(savedUser);

        // Basic check that response wraps an AuthRes (no assumption on ApiRes API)
        assertNotNull(res.getBody().data());
        assertInstanceOf(AuthRes.class, res.getBody().data());
        AuthRes data = (AuthRes) res.getBody().data();
        assertEquals("jwt-token", data.token());
        assertEquals(AuthProvider.LOCAL.name(), data.provider());
    }

    @Test
    void givenSignIn_whenUserNotFound_thenThrowNotFoundException() {
        SignInRequest req = new SignInRequest("noone@example.com", "x");
        when(userRepository.findByEmail(req.email())).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> authService.signIn(req));
        verify(userRepository).findByEmail(req.email());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void givenSignIn_whenLocalAndPasswordMatches_thenGenerateTokenAndReturnOk() {
        SignInRequest req = new SignInRequest("user@example.com", "pw");
        User user =
                User.builder()
                        .email(req.email())
                        .authProvider(AuthProvider.LOCAL)
                        .hashedPassword("hashed")
                        .build();

        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(req.password(), user.getHashedPassword())).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt");

        ApiRes res = authService.signIn(req);

        assertNotNull(res);
        verify(jwtService).generateToken(user);
        assertInstanceOf(AuthRes.class, res.getBody().data());
        assertTrue(res.getBody().isSuccess());
        AuthRes data = (AuthRes) res.getBody().data();
        assertEquals("jwt", data.token());
        assertEquals(AuthProvider.LOCAL.name(), data.provider());
    }

    @Test
    void givenSignIn_whenLocalAndPasswordMismatch_thenReturnUnauthorized() {
        SignInRequest req = new SignInRequest("user2@example.com", "pw");
        User user =
                User.builder()
                        .email(req.email())
                        .authProvider(AuthProvider.LOCAL)
                        .hashedPassword("hashed")
                        .build();

        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(req.password(), user.getHashedPassword())).thenReturn(false);

        ApiRes res = authService.signIn(req);

        assertNotNull(res);
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void givenSignIn_whenNonLocalProvider_thenReturnUnauthorizedEvenIfPasswordMatches() {
        SignInRequest req = new SignInRequest("social@example.com", "pw");
        User user =
                User.builder()
                        .email(req.email())
                        .authProvider(AuthProvider.GOOGLE)
                        .hashedPassword("hashed")
                        .build();

        when(userRepository.findByEmail(req.email())).thenReturn(Optional.of(user));

        ApiRes res = authService.signIn(req);

        assertNotNull(res);
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void givenSignInWithProvider_whenMissingToken_thenReturnUnauthorized() {
        ApiRes res = authService.signInWithProvider(Map.of());
        assertNotNull(res);
        verifyNoInteractions(googleAuthService, userRepository, jwtService);
    }

    @Test
    void givenSignInWithProvider_whenInvalidToken_thenReturnUnauthorized() {
        Map<String, String> payload = Map.of("token", "bad");
        when(googleAuthService.verify("bad")).thenReturn(null);

        ApiRes res = authService.signInWithProvider(payload);

        assertNotNull(res);
        verify(googleAuthService).verify("bad");
        verifyNoInteractions(userRepository, jwtService);
    }

    @Test
    void givenSignInWithProvider_whenValidTokenAndUserExists_thenUseExistingUserAndGenerateToken() {
        String token = "good";
        String email = "exists@example.com";
        GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);
        when(payload.getEmail()).thenReturn(email);
        when(googleAuthService.verify(token)).thenReturn(payload);

        User existing =
                User.builder()
                        .email(email)
                        .authProvider(AuthProvider.GOOGLE)
                        .name("Existing")
                        .pictureUrl("pic")
                        .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(existing)).thenReturn("jwt-exists");

        ApiRes res = authService.signInWithProvider(Map.of("token", token));

        assertNotNull(res);
        verify(googleAuthService).verify(token);
        verify(userRepository, never()).save(any());
        verify(jwtService).generateToken(existing);
        assertInstanceOf(AuthRes.class, res.getBody().data());
        AuthRes data = (AuthRes) res.getBody().data();
        assertEquals("jwt-exists", data.token());
        assertEquals(AuthProvider.GOOGLE.name(), data.provider());
    }

    @Test
    void
            givenSignInWithProvider_whenValidTokenAndUserDoesNotExist_thenCreateUserSaveAndGenerateToken() {
        String token = "new";
        String email = "new@example.com";
        GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);
        when(payload.getEmail()).thenReturn(email);
        when(payload.get("name")).thenReturn("New User");
        when(payload.get("picture")).thenReturn("new-pic");
        when(googleAuthService.verify(token)).thenReturn(payload);

        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());

        User saved =
                User.builder()
                        .email(email)
                        .name("New User")
                        .authProvider(AuthProvider.GOOGLE)
                        .pictureUrl("new-pic")
                        .build();

        when(userRepository.save(any())).thenReturn(saved);
        when(jwtService.generateToken(saved)).thenReturn("jwt-new");

        ApiRes res = authService.signInWithProvider(Map.of("token", token));

        assertNotNull(res);
        verify(googleAuthService).verify(token);
        verify(userRepository).save(userCaptor.capture());
        User created = userCaptor.getValue();
        assertEquals(email, created.getEmail());
        assertEquals(AuthProvider.GOOGLE, created.getAuthProvider());
        assertEquals("New User", created.getName());
        assertEquals("new-pic", created.getPictureUrl());
        verify(jwtService).generateToken(saved);

        assertInstanceOf(AuthRes.class, res.getBody().data());
        AuthRes data = (AuthRes) res.getBody().data();
        assertEquals("jwt-new", data.token());
        assertEquals(AuthProvider.GOOGLE.name(), data.provider());
    }
}
