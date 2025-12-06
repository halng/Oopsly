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

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingConfig implements Filter {
    private static final Logger LOGGER = LoggerFactory.getLogger(LoggingConfig.class);

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        Filter.super.init(filterConfig);
    }

    @Override
    public void doFilter(
            ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        long startTime = System.currentTimeMillis();

        HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;
        String method = httpRequest.getMethod();
        String path = httpRequest.getRequestURI();

        try {
            filterChain.doFilter(servletRequest, servletResponse);
            long duration = System.currentTimeMillis() - startTime;

            int status =
                    (servletResponse instanceof HttpServletResponse)
                            ? ((HttpServletResponse) servletResponse).getStatus()
                            : 0;

            LOGGER.info("Request: {} {} | Status: {} | {} ms", method, path, status, duration);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            LOGGER.error(
                    "Request: {} {} | Failed after {} ms | Error: {}",
                    method,
                    path,
                    duration,
                    e.getMessage(),
                    e);
            throw e;
        }
    }

    @Override
    public void destroy() {
        Filter.super.destroy();
    }
}
