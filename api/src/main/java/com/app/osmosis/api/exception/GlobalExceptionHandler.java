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

package com.app.osmosis.api.exception;

import com.app.osmosis.api.viewmodel.ApiRes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UnauthenticatedException.class)
    public ApiRes handleUnauthenticatedException(UnauthenticatedException ex) {
        log.warn("Unauthenticated access attempt: {}", ex.getMessage());
        return ApiRes.unauthorized("You must be logged in to access this resource.");
    }

    @Order(1000)
    @ExceptionHandler(Exception.class)
    public ApiRes handleGenericException(Exception ex) {
        log.error("Generic internal server error: {}", ex.getMessage(), ex);
        return ApiRes.internalError(
                "Internal server error occurred. Please contact support if the problem persists.");
    }
}
