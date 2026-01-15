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

package com.app.oopsly.api.exception;

import com.app.oopsly.api.viewmodel.ApiRes;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.ServletException;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ApiRes handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Bad credentials provided: {}", ex.getMessage());
        return ApiRes.forbidden(ex.getMessage());
    }

    @ExceptionHandler(NotFoundException.class)
    public ApiRes handleNotFoundException(NotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ApiRes.notFound(ex.getMessage());
    }

    @ExceptionHandler(ValidationException.class)
    public ApiRes handleValidationException(ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ApiRes.badRequest(ex.getMessage());
    }

    @ExceptionHandler(UnauthenticatedException.class)
    public ApiRes handleUnauthenticatedException(UnauthenticatedException ex) {
        log.error(
                "Unauthenticated access attempt: {} with causes: {}",
                ex.getMessage(),
                ex.getStackTrace());
        return ApiRes.unauthorized("You must be logged in to access this resource.");
    }

    @ExceptionHandler(AuthProviderException.class)
    public ApiRes handleAuthProviderException(AuthProviderException ex) {
        log.error("Authentication provider error: {}", ex.getMessage(), ex);
        return ApiRes.unauthorized("Authentication failed. Please try again.");
    }

    @ExceptionHandler(SendEmailException.class)
    public ApiRes handleSendEmailException(SendEmailException ex) {
        log.error("Email sending failed: {}", ex.getMessage(), ex);
        return ApiRes.internalError("Failed to send email. Please try again later.");
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ApiRes handleExpiredJwt(ExpiredJwtException ex) {
        log.error("Expired JWT access attempt: {}", ex.getMessage());
        return ApiRes.unauthorized("Token has expired");
    }

    // Handle Invalid Signature
    @ExceptionHandler(SignatureException.class)
    public ApiRes handleSignatureException(SignatureException ex) {
        return ApiRes.unauthorized("Invalid token signature");
    }

    // Handle Malformed/General JWT errors
    @ExceptionHandler(MalformedJwtException.class)
    public ApiRes handleMalformedJwt(MalformedJwtException ex) {
        return ApiRes.unauthorized("Invalid token format");
    }

    // handle IOException
    @ExceptionHandler(IOException.class)
    public ApiRes handleIOException(IOException ex) {
        log.error("IO error occurred: {}", ex.getMessage(), ex);
        return ApiRes.internalError("An internal IO error occurred. Please try again later.");
    }

    // handle ServletException
    @ExceptionHandler({
        ServletException.class,
        IllegalArgumentException.class,
        HandlerMethodValidationException.class,
        MethodArgumentNotValidException.class
    })
    public ApiRes handleServletException(Exception ex) {
        log.error("Servlet error occurred: {}", ex.getMessage(), ex);
        return ApiRes.badRequest("Bad request. Please check your input and try again.");
    }

    @ExceptionHandler(RetryLaterException.class)
    public ApiRes handleRetryLaterException(RetryLaterException ex) {
        log.warn("Service busy, retry later: {}", ex.getMessage());
        return ApiRes.retryLater(
                "Service is busy or something went wrong. Please try again later.");
    }

    // Generic Exception Handler - must be the last one
    @Order(1000)
    @ExceptionHandler(Exception.class)
    public ApiRes handleGenericException(Exception ex) {
        log.error("Generic internal server error: {}", ex.getMessage(), ex);
        return ApiRes.internalError(
                "Internal server error occurred. Please contact support if the problem persists.");
    }
}
