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

package com.app.oopsly.api.shared.application.vm;

import java.time.Instant;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;

public class ApiRes extends ResponseEntity<Res> {
    public ApiRes(HttpStatusCode status) {
        super(status);
    }

    public ApiRes(Res body, HttpHeaders headers, HttpStatusCode statusCode) {
        super(body, headers, statusCode);
    }

    public ApiRes(Res body, HttpHeaders headers, int rawStatus) {
        super(body, headers, rawStatus);
    }

    public ApiRes(HttpHeaders headers, HttpStatusCode status) {
        super(headers, status);
    }

    public ApiRes(Res body, HttpStatusCode status) {
        super(body, status);
    }

    private static ApiRes build(HttpStatus status, boolean isSuccess, String message, Object data) {
        return new ApiRes(new Res(isSuccess, Instant.now(), message, status.value(), data), status);
    }

    public static ApiRes created(String message) {
        return build(HttpStatus.CREATED, true, message, null);
    }

    public static ApiRes created(String message, Object data) {
        return build(HttpStatus.CREATED, true, message, data);
    }

    public static ApiRes conflict(String message) {
        return build(HttpStatus.CONFLICT, false, message, null);
    }

    public static ApiRes badRequest(String message) {
        return build(HttpStatus.BAD_REQUEST, false, message, null);
    }

    public static ApiRes internalError(String message) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, false, message, null);
    }

    public static ApiRes notFound(String message) {
        return build(HttpStatus.NOT_FOUND, false, message, null);
    }

    public static ApiRes ok(String message) {
        return build(HttpStatus.OK, true, message, null);
    }

    public static ApiRes ok(String message, Object data) {
        return build(HttpStatus.OK, true, message, data);
    }

    public static ApiRes accepted(String message) {
        return build(HttpStatus.ACCEPTED, true, message, null);
    }

    public static ApiRes unauthorized(String message) {
        return build(HttpStatus.UNAUTHORIZED, false, message, null);
    }

    public static ApiRes forbidden(String message) {
        return build(HttpStatus.FORBIDDEN, false, message, null);
    }

    public static ApiRes error(String message) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, false, message, null);
    }

    public static ApiRes success(String message) {
        return build(HttpStatus.OK, true, message, null);
    }

    public static ApiRes success(String message, Object data) {
        return build(HttpStatus.OK, true, message, data);
    }

    public static ApiRes rateLimitExceeded(String message) {
        return build(HttpStatus.TOO_MANY_REQUESTS, false, message, null);
    }

    public static ApiRes forbidden(String message, Object data) {
        return build(HttpStatus.FORBIDDEN, false, message, data);
    }

    public static ApiRes retryLater(String message) {
        return build(HttpStatus.SERVICE_UNAVAILABLE, false, message, null);
    }
}
