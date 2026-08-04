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

package com.app.oopsly.api.unit.config;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.config.FirebaseAuthenticationFilter;
import com.app.oopsly.api.config.PerfSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

class PerfSecurityConfigTest {

    @Test
    void givenPerfProfile_whenSecurityChainBuilt_thenFirebaseAuthenticationIsConfigured()
            throws Exception {
        FirebaseAuthenticationFilter firebaseAuthFilter = mock(FirebaseAuthenticationFilter.class);
        PerfSecurityConfig config = new PerfSecurityConfig(firebaseAuthFilter);
        HttpSecurity httpSecurity = mock(HttpSecurity.class, RETURNS_DEEP_STUBS);
        when(httpSecurity.csrf(any())).thenReturn(httpSecurity);
        when(httpSecurity.sessionManagement(any())).thenReturn(httpSecurity);
        when(httpSecurity.authorizeHttpRequests(any())).thenReturn(httpSecurity);
        when(httpSecurity.addFilterBefore(any(), any())).thenReturn(httpSecurity);
        when(httpSecurity.formLogin(any())).thenReturn(httpSecurity);
        when(httpSecurity.build()).thenReturn(mock(DefaultSecurityFilterChain.class));

        SecurityFilterChain chain = config.perfSecurityFilterChain(httpSecurity);

        assertNotNull(chain);
        verify(httpSecurity).csrf(any());
        verify(httpSecurity).sessionManagement(any());
        verify(httpSecurity).authorizeHttpRequests(any());
        verify(httpSecurity)
                .addFilterBefore(
                        eq(firebaseAuthFilter), eq(UsernamePasswordAuthenticationFilter.class));
        verify(httpSecurity).formLogin(any());
        verify(httpSecurity).build();
    }
}
