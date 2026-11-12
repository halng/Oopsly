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

package com.app.quizi.api.unit.config;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.quizi.api.config.AppConfig;
import com.app.quizi.api.config.JwtAuthenticationFilter;
import com.app.quizi.api.config.SecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock private JwtAuthenticationFilter jwtAuthFilter;

    private SecurityConfig securityConfig;
    @Mock private AppConfig appConfig;
    @Mock private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        securityConfig = new SecurityConfig(jwtAuthFilter, appConfig, objectMapper);
    }

    @Test
    void givenSecurityConfig_whenInitialized_thenJwtFilterIsSet() {
        assertNotNull(securityConfig);
    }

    @Test
    void givenSecurityFilterChain_whenConfigured_thenReturnsNonNull() throws Exception {
        HttpSecurity httpSecurity = mock(HttpSecurity.class, RETURNS_DEEP_STUBS);
        when(httpSecurity.csrf(any())).thenReturn(httpSecurity);
        when(httpSecurity.sessionManagement(any())).thenReturn(httpSecurity);
        when(httpSecurity.exceptionHandling(any())).thenReturn(httpSecurity);
        when(httpSecurity.authorizeHttpRequests(any())).thenReturn(httpSecurity);
        when(httpSecurity.formLogin(any())).thenReturn(httpSecurity);
        when(httpSecurity.addFilterBefore(any(), any())).thenReturn(httpSecurity);
        when(httpSecurity.build()).thenReturn(mock(DefaultSecurityFilterChain.class));

        SecurityFilterChain chain = securityConfig.securityFilterChain(httpSecurity);

        assertNotNull(chain);
        verify(httpSecurity).csrf(any());
        verify(httpSecurity).sessionManagement(any());
        verify(httpSecurity).authorizeHttpRequests(any());
        verify(httpSecurity).formLogin(any());
        verify(httpSecurity)
                .addFilterBefore(eq(jwtAuthFilter), eq(UsernamePasswordAuthenticationFilter.class));
        verify(httpSecurity).build();
    }

    @Test
    void givenCorsConfigurer_whenRetrieved_thenReturnsNonNull() {
        WebMvcConfigurer configurer = securityConfig.corsConfigurer();

        assertNotNull(configurer);
    }
}
