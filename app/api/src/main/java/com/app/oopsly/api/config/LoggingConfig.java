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

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

@Component
public class LoggingConfig implements Filter {
    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingConfig.class);
    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String REQUEST_PLATFORM_HEADER = "X-Platform";
    private static final String MDC_REQUEST_PLATFORM_KEY = "XP";
    private static final String MDC_REQUEST_ID_KEY = "XID";
    private static final String INTERNAL_KEY_HEADER = "x-internal-key";
    private static final int MAX_HEADER_VALUE_LENGTH = 200;
    private static final Pattern SECRET_HEADER =
            Pattern.compile("authorization|cookie|token|secret|password|api-key");

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        Filter.super.init(filterConfig);
    }

    @Override
    public void doFilter(
            ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        String requestId = httpRequest.getHeader(REQUEST_ID_HEADER);
        String platform = httpRequest.getHeader(REQUEST_PLATFORM_HEADER);

        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }
        MDC.put(MDC_REQUEST_ID_KEY, requestId);
        if (platform != null && !platform.isEmpty()) {
            MDC.put(MDC_REQUEST_PLATFORM_KEY, platform);
        }

        long startTime = System.currentTimeMillis();
        String method = httpRequest.getMethod();
        String path = httpRequest.getRequestURI();

        try {
            filterChain.doFilter(servletRequest, servletResponse);
            long duration = System.currentTimeMillis() - startTime;

            int status =
                    (servletResponse instanceof HttpServletResponse)
                            ? ((HttpServletResponse) servletResponse).getStatus()
                            : 0;

            if (status >= 400) {
                // Rejected requests carry their (masked) headers so a 401/403 can be diagnosed
                // from the log alone.
                LOGGER.info(
                        "Request: {} {} | Status: {} | {} ms | Headers: {}",
                        method,
                        path,
                        status,
                        duration,
                        maskedHeaders(httpRequest));
            } else {
                LOGGER.info("Request: {} {} | Status: {} | {} ms", method, path, status, duration);
            }

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            LOGGER.error(
                    "Request: {} {} | Failed after {} ms | Error: {} | Headers: {}",
                    method,
                    path,
                    duration,
                    e.getMessage(),
                    maskedHeaders(httpRequest),
                    e);
            throw e;
        } finally {
            MDC.clear();
        }
    }

    /**
     * Request headers that are safe to log. Credentials (Authorization/access tokens, cookies,
     * anything token-like) are never written; the internal service key is reduced to a fingerprint
     * so a mismatch between two services can still be spotted.
     */
    public static Map<String, String> maskedHeaders(HttpServletRequest request) {
        Map<String, String> safe = new LinkedHashMap<>();
        if (request.getHeaderNames() == null) {
            return safe;
        }
        for (String name : Collections.list(request.getHeaderNames())) {
            String key = name.toLowerCase();
            String value = request.getHeader(name);
            if (value == null) {
                continue;
            }
            if (INTERNAL_KEY_HEADER.equals(key)) {
                safe.put(key, fingerprint(value));
            } else if (SECRET_HEADER.matcher(key).find()) {
                safe.put(key, "***");
            } else {
                safe.put(
                        key,
                        value.length() > MAX_HEADER_VALUE_LENGTH
                                ? value.substring(0, MAX_HEADER_VALUE_LENGTH)
                                : value);
            }
        }
        return safe;
    }

    /** Length plus a short hash: enough to compare two keys, not to recover one. */
    private static String fingerprint(String value) {
        try {
            byte[] digest =
                    MessageDigest.getInstance("SHA-256")
                            .digest(value.getBytes(StandardCharsets.UTF_8));
            return "<len=%d sha256=%s>"
                    .formatted(value.length(), HexFormat.of().formatHex(digest).substring(0, 8));
        } catch (NoSuchAlgorithmException e) {
            return "<len=%d>".formatted(value.length());
        }
    }

    @Override
    public void destroy() {
        Filter.super.destroy();
    }
}
