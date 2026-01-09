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

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class LoggingConfigTest {

    private final LoggingConfig loggingConfig = new LoggingConfig();

    private Logger logger;
    private ListAppender<ILoggingEvent> listAppender;

    @Mock HttpServletRequest request;

    @Mock HttpServletResponse response;

    @Mock FilterChain filterChain;

    @BeforeEach
    void setUp() {
        logger = (Logger) LoggerFactory.getLogger(LoggingConfig.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        logger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        if (listAppender != null) {
            logger.detachAppender(listAppender);
            listAppender.stop();
        }
    }

    @Test
    void givenLoggingConfig_withSuccessfulRequest_thenLogsInfoAndChainCalled() throws Exception {
        when(request.getMethod()).thenReturn("GET");
        when(request.getRequestURI()).thenReturn("/api/health");
        when(response.getStatus()).thenReturn(200);

        loggingConfig.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty(), "expected at least one log entry");

        boolean found =
                logs.stream()
                        .anyMatch(
                                e ->
                                        e.getLevel() == Level.INFO
                                                && e.getFormattedMessage()
                                                        .contains(
                                                                "Request: GET /api/health | Status:"
                                                                        + " 200"));
        assertTrue(found, "Expected INFO log with request path and status");
    }

    @Test
    void givenLoggingConfig_withFilterThrowingException_thenLogsErrorAndRethrows()
            throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getRequestURI()).thenReturn("/api/test");
        doThrow(new ServletException("boom")).when(filterChain).doFilter(request, response);

        ServletException thrown =
                assertThrows(
                        ServletException.class,
                        () -> loggingConfig.doFilter(request, response, filterChain));
        assertEquals("boom", thrown.getMessage());

        List<ILoggingEvent> logs = listAppender.list;
        assertFalse(logs.isEmpty(), "expected at least one log entry");

        boolean found =
                logs.stream()
                        .anyMatch(
                                e ->
                                        e.getLevel() == Level.ERROR
                                                && e.getFormattedMessage()
                                                        .contains(
                                                                "Request: POST /api/test | Failed"
                                                                        + " after")
                                                && e.getFormattedMessage().contains("Error: boom"));
        assertTrue(found, "Expected ERROR log containing failure details and error message");
    }
}
