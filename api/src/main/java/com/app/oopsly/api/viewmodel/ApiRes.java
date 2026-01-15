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

package com.app.oopsly.api.viewmodel;

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

    public static ApiRes created(String message) {
        return new ApiRes(new Res(201, message, null, true, Instant.now()), HttpStatus.CREATED);
    }

    public static ApiRes created(String message, Object data) {
        return new ApiRes(new Res(201, message, data, true, Instant.now()), HttpStatus.CREATED);
    }

    public static ApiRes conflict(String message) {
        return new ApiRes(new Res(409, message, null, false, Instant.now()), HttpStatus.CONFLICT);
    }

    public static ApiRes badRequest(String message) {
        return new ApiRes(
                new Res(400, message, null, false, Instant.now()), HttpStatus.BAD_REQUEST);
    }

    public static ApiRes internalError(String message) {
        return new ApiRes(
                new Res(500, message, null, false, Instant.now()),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static ApiRes notFound(String message) {
        return new ApiRes(new Res(404, message, null, false, Instant.now()), HttpStatus.NOT_FOUND);
    }

    public static ApiRes ok(String message) {
        return new ApiRes(new Res(200, message, null, true, Instant.now()), HttpStatus.OK);
    }

    public static ApiRes ok(String message, Object data) {
        return new ApiRes(new Res(200, message, data, true, Instant.now()), HttpStatus.OK);
    }

    public static ApiRes accepted(String message) {
        return new ApiRes(new Res(202, message, null, true, Instant.now()), HttpStatus.ACCEPTED);
    }

    public static ApiRes unauthorized(String message) {
        return new ApiRes(
                new Res(401, message, null, false, Instant.now()), HttpStatus.UNAUTHORIZED);
    }

    public static ApiRes forbidden(String message) {
        return new ApiRes(new Res(403, message, null, false, Instant.now()), HttpStatus.FORBIDDEN);
    }

    public static ApiRes error(String message) {
        return new ApiRes(
                new Res(500, message, null, false, Instant.now()),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public static ApiRes success(String message) {
        return new ApiRes(new Res(200, message, null, true, Instant.now()), HttpStatus.OK);
    }

    public static ApiRes success(String message, Object data) {
        return new ApiRes(new Res(200, message, data, true, Instant.now()), HttpStatus.OK);
    }

    public static ApiRes rateLimitExceeded(String message) {
        return new ApiRes(
                new Res(429, message, null, false, Instant.now()), HttpStatus.TOO_MANY_REQUESTS);
    }

    public static ApiRes forbidden(String message, Object data) {
        return new ApiRes(new Res(403, message, data, false, Instant.now()), HttpStatus.FORBIDDEN);
    }

    public static ApiRes retryLater(String message) {
        return new ApiRes(
                new Res(503, message, null, false, Instant.now()), HttpStatus.SERVICE_UNAVAILABLE);
    }
}
