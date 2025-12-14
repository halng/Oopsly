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

package com.app.osmosis.api.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Test
    void givenSecurityConfig_withPasswordEncoder_thenProvidesBCrypt() {
        JwtAuthenticationFilter jwtMock = mock(JwtAuthenticationFilter.class);
        SecurityConfig cfg = new SecurityConfig(jwtMock);

        PasswordEncoder enc = cfg.passwordEncoder();

        assertNotNull(enc);
        assertInstanceOf(BCryptPasswordEncoder.class, enc, "expected BCryptPasswordEncoder");
    }

    @Test
    void givenSecurityConfig_whenBuildingFilterChain_thenChainedMethodsCalledAndFilterAdded()
            throws Exception {
        JwtAuthenticationFilter jwtMock = mock(JwtAuthenticationFilter.class);
        SecurityConfig cfg = new SecurityConfig(jwtMock);

        // Mock HttpSecurity and the returned SecurityFilterChain
        HttpSecurity http = mock(HttpSecurity.class);
        SecurityFilterChain builtChain = mock(SecurityFilterChain.class);

        // Stub chaining methods to return the same mock so calls can be verified
        when(http.csrf(any())).thenReturn(http);
        when(http.sessionManagement(any())).thenReturn(http);
        when(http.authorizeHttpRequests(any())).thenReturn(http);
        when(http.formLogin(any())).thenReturn(http);
        when(http.oauth2Login(any())).thenReturn(http);
        when(http.addFilterBefore(jwtMock, UsernamePasswordAuthenticationFilter.class))
                .thenReturn(http);
        when(http.build()).thenReturn((DefaultSecurityFilterChain) builtChain);

        SecurityFilterChain chain = cfg.securityFilterChain(http);

        assertNotNull(chain, "securityFilterChain should return the built SecurityFilterChain");

        // verify all expected chained configuration steps were invoked
        verify(http).csrf(any());
        verify(http).sessionManagement(any());
        verify(http).authorizeHttpRequests(any());
        verify(http).formLogin(any());
        verify(http).oauth2Login(any());

        // verify the JWT filter was registered before the UsernamePasswordAuthenticationFilter
        verify(http).addFilterBefore(jwtMock, UsernamePasswordAuthenticationFilter.class);

        verify(http).build();
    }

    @Test
    void givenSecurityConfig_whenAuthorizeHttpRequestsCalled_thenCustomizerProvided()
            throws Exception {
        JwtAuthenticationFilter jwtMock = mock(JwtAuthenticationFilter.class);
        SecurityConfig cfg = new SecurityConfig(jwtMock);

        HttpSecurity http = mock(HttpSecurity.class);
        SecurityFilterChain builtChain = mock(SecurityFilterChain.class);

        when(http.csrf(any())).thenReturn(http);
        when(http.sessionManagement(any())).thenReturn(http);

        // capture the authorizeHttpRequests argument (a lambda/customizer)
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        when(http.authorizeHttpRequests(
                        (Customizer<
                                        AuthorizeHttpRequestsConfigurer<HttpSecurity>
                                                .AuthorizationManagerRequestMatcherRegistry>)
                                captor.capture()))
                .thenReturn(http);

        when(http.formLogin(any())).thenReturn(http);
        when(http.oauth2Login(any())).thenReturn(http);
        when(http.addFilterBefore(jwtMock, UsernamePasswordAuthenticationFilter.class))
                .thenReturn(http);
        when(http.build()).thenReturn((DefaultSecurityFilterChain) builtChain);

        cfg.securityFilterChain(http);

        // ensure a non-null customizer/lambda was passed to authorizeHttpRequests
        Object captured = captor.getValue();
        assertNotNull(captured, "Expected a customizer/lambda passed to authorizeHttpRequests");

        // basic verification that the captured object is invoked as a lambda/functional type isn't
        // performed
        // here because the actual registry types are part of Spring internals. Presence of a
        // captured
        // customizer indicates the configuration attempts to set request permissions as in the
        // original
        // code.
        verify(http).authorizeHttpRequests(any());
    }
}
