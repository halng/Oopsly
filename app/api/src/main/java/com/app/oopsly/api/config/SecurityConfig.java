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

package com.app.oopsly.api.config;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private static final Logger LOG = LoggerFactory.getLogger(SecurityConfig.class);
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AppConfig appConfig;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthFilter,
            AppConfig appConfig,
            ObjectMapper objectMapper,
            Environment environment) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.appConfig = appConfig;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        handler ->
                                handler.authenticationEntryPoint(
                                                (request, response, ex) -> {
                                                    writeErrorResponse(
                                                            response,
                                                            ApiRes.unauthorized(
                                                                    "You must be logged in to"
                                                                            + " access this"
                                                                            + " resource."));
                                                })
                                        .accessDeniedHandler(
                                                (request, response, ex) ->
                                                        writeErrorResponse(
                                                                response,
                                                                ApiRes.forbidden(
                                                                        "You do not have permission"
                                                                                + " to access this"
                                                                                + " resource."))))
                .authorizeHttpRequests(
                        req ->
                                req.requestMatchers(
                                                "/v1/otp/**",
                                                "/actuator/health",
                                                "**/refresh-token",
                                                "/swagger-ui/**",
                                                "/api-docs/**")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll() // Allow OPTIONS everywhere
                                        .anyRequest()
                                        .authenticated())
                .formLogin(AbstractHttpConfigurer::disable)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {

        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry corsRegistry) {
                String configuredOrigins = appConfig.getAllowedOrigins();
                String[] requestedOrigins =
                        configuredOrigins == null
                                ? new String[0]
                                : Arrays.stream(configuredOrigins.split(","))
                                        .map(String::trim)
                                        .filter(origin -> !origin.isEmpty())
                                        .toArray(String[]::new);
                boolean hasWildcard = Arrays.stream(requestedOrigins).anyMatch("*"::equals);
                boolean isTestOrDevProfile =
                        environment.acceptsProfiles(Profiles.of("test", "dev", "integration"));
                if (hasWildcard && !isTestOrDevProfile) {
                    throw new IllegalStateException(
                            "app.allowed-origins cannot include wildcard outside test/dev");
                }
                String[] allowedOrigins = hasWildcard ? new String[] {"*"} : requestedOrigins;
                if (allowedOrigins.length == 0) {
                    throw new IllegalStateException(
                            "app.allowed-origins must include at least one explicit origin");
                }
                corsRegistry
                        .addMapping("/**")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "OPTIONS")
                        .allowedOrigins(allowedOrigins)
                        .allowedHeaders("*");
            }
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    private void writeErrorResponse(HttpServletResponse response, ApiRes apiRes) {
        if (response.isCommitted()) {
            LOG.warn("Response already committed, skipping error body write");
            return;
        }
        try {
            response.setStatus(apiRes.getStatusCode().value());
            response.setContentType("application/json");
            response.getWriter().write(objectMapper.writeValueAsString(apiRes.getBody()));
        } catch (IOException e) {
            LOG.error("Failed to write security response", e);
        }
    }
}
