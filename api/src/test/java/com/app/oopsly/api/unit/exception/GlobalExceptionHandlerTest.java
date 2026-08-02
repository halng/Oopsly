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

package com.app.oopsly.api.unit.exception;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.exception.AuthProviderException;
import com.app.oopsly.api.exception.GlobalExceptionHandler;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.RetryLaterException;
import com.app.oopsly.api.exception.SendEmailException;
import com.app.oopsly.api.exception.UnauthenticatedException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.viewmodel.ApiRes;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @InjectMocks private GlobalExceptionHandler globalExceptionHandler;

    @BeforeEach
    void setUp() {}

    @Test
    void handleBadCredentialsException_returnsForbidden() {
        BadCredentialsException ex = new BadCredentialsException("Invalid credentials");

        ApiRes result = globalExceptionHandler.handleBadCredentialsException(ex);

        assertNotNull(result);
        assertEquals(403, result.getStatusCode().value());
    }

    @Test
    void handleNotFoundException_returnsNotFound() {
        NotFoundException ex = new NotFoundException("Resource not found");

        ApiRes result = globalExceptionHandler.handleNotFoundException(ex);

        assertNotNull(result);
        assertEquals(404, result.getStatusCode().value());
    }

    @Test
    void handleUnauthenticatedException_returnsUnauthorized() {
        UnauthenticatedException ex = new UnauthenticatedException("Not authenticated");

        ApiRes result = globalExceptionHandler.handleUnauthenticatedException(ex);

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void handleAuthProviderException_returnsUnauthorized() {
        AuthProviderException ex = new AuthProviderException("Auth provider failed");

        ApiRes result = globalExceptionHandler.handleAuthProviderException(ex);

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void handleSendEmailException_returnsInternalError() {
        SendEmailException ex = new SendEmailException("Email failed");

        ApiRes result = globalExceptionHandler.handleSendEmailException(ex);

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
    }

    @Test
    void handleExpiredJwt_returnsUnauthorized() {
        ExpiredJwtException ex = mock(ExpiredJwtException.class);
        when(ex.getMessage()).thenReturn("Token expired");

        ApiRes result = globalExceptionHandler.handleExpiredJwt(ex);

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void handleSignatureException_returnsUnauthorized() {
        SignatureException ex = new SignatureException("Invalid signature");

        ApiRes result = globalExceptionHandler.handleSignatureException(ex);

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void handleMalformedJwt_returnsUnauthorized() {
        MalformedJwtException ex = new MalformedJwtException("Malformed token");

        ApiRes result = globalExceptionHandler.handleMalformedJwt(ex);

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
    }

    @Test
    void handleIOException_returnsInternalError() {
        IOException ex = new IOException("IO error");

        ApiRes result = globalExceptionHandler.handleIOException(ex);

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
    }

    @Test
    void handleServletException_returnsBadRequest() {
        ServletException ex = new ServletException("Servlet error");

        ApiRes result = globalExceptionHandler.handleServletException(ex);

        assertNotNull(result);
        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void handleIllegalArgumentException_returnsBadRequest() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid argument");

        ApiRes result = globalExceptionHandler.handleServletException(new ServletException(ex));

        assertNotNull(result);
        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void handleGenericException_returnsInternalError() {
        Exception ex = new Exception("Generic error");

        ApiRes result = globalExceptionHandler.handleGenericException(ex);

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
    }

    @Test
    void handleGenericException_withRuntimeException_returnsInternalError() {
        RuntimeException ex = new RuntimeException("Runtime error");

        ApiRes result = globalExceptionHandler.handleGenericException(ex);

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
    }

    @Test
    void handleGenericException_withNullPointerException_returnsInternalError() {
        NullPointerException ex = new NullPointerException("Null pointer");

        ApiRes result = globalExceptionHandler.handleGenericException(ex);

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
    }

    @Test
    void handleValidationException_returnsBadRequest() {
        ValidationException ex = new ValidationException("invalid");
        ApiRes result = globalExceptionHandler.handleValidationException(ex);
        assertEquals(400, result.getStatusCode().value());
    }

    @Test
    void handleRetryLaterException_returnsRetryLater() {
        RetryLaterException ex = new RetryLaterException("busy", new RuntimeException("x"));
        ApiRes result = globalExceptionHandler.handleRetryLaterException(ex);
        assertEquals(503, result.getStatusCode().value());
    }
}
