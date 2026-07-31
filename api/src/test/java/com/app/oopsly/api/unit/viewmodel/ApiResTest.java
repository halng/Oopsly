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

package com.app.oopsly.api.unit.viewmodel;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.Res;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

class ApiResTest {

    @Test
    void created_withMessage_returnsCreatedStatus() {
        ApiRes result = ApiRes.created("Resource created");

        assertNotNull(result);
        assertEquals(201, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Resource created", result.getBody().message());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void created_withMessageAndData_returnsCreatedStatusWithData() {
        Object data = "test data";
        ApiRes result = ApiRes.created("Resource created", data);

        assertNotNull(result);
        assertEquals(201, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Resource created", result.getBody().message());
        assertEquals(data, result.getBody().data());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void conflict_returnsConflictStatus() {
        ApiRes result = ApiRes.conflict("Conflict occurred");

        assertNotNull(result);
        assertEquals(409, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Conflict occurred", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void badRequest_returnsBadRequestStatus() {
        ApiRes result = ApiRes.badRequest("Bad request");

        assertNotNull(result);
        assertEquals(400, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Bad request", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void internalError_returnsInternalServerErrorStatus() {
        ApiRes result = ApiRes.internalError("Internal error");

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Internal error", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void notFound_returnsNotFoundStatus() {
        ApiRes result = ApiRes.notFound("Not found");

        assertNotNull(result);
        assertEquals(404, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Not found", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void ok_withMessage_returnsOkStatus() {
        ApiRes result = ApiRes.ok("Success");

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Success", result.getBody().message());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void ok_withMessageAndData_returnsOkStatusWithData() {
        Object data = "test data";
        ApiRes result = ApiRes.ok("Success", data);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Success", result.getBody().message());
        assertEquals(data, result.getBody().data());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void accepted_returnsAcceptedStatus() {
        ApiRes result = ApiRes.accepted("Accepted");

        assertNotNull(result);
        assertEquals(202, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Accepted", result.getBody().message());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void unauthorized_returnsUnauthorizedStatus() {
        ApiRes result = ApiRes.unauthorized("Unauthorized");

        assertNotNull(result);
        assertEquals(401, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Unauthorized", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void forbidden_withMessage_returnsForbiddenStatus() {
        ApiRes result = ApiRes.forbidden("Forbidden");

        assertNotNull(result);
        assertEquals(403, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Forbidden", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void forbidden_withMessageAndData_returnsForbiddenStatusWithData() {
        Object data = "test data";
        ApiRes result = ApiRes.forbidden("Forbidden", data);

        assertNotNull(result);
        assertEquals(403, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Forbidden", result.getBody().message());
        assertEquals(data, result.getBody().data());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void error_returnsInternalServerErrorStatus() {
        ApiRes result = ApiRes.error("Error");

        assertNotNull(result);
        assertEquals(500, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Error", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void success_withMessage_returnsSuccessStatus() {
        ApiRes result = ApiRes.success("Success");

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Success", result.getBody().message());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void success_withMessageAndData_returnsSuccessStatusWithData() {
        Object data = "test data";
        ApiRes result = ApiRes.success("Success", data);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Success", result.getBody().message());
        assertEquals(data, result.getBody().data());
        assertTrue(result.getBody().isSuccess());
    }

    @Test
    void rateLimitExceeded_returnsTooManyRequestsStatus() {
        ApiRes result = ApiRes.rateLimitExceeded("Rate limit exceeded");

        assertNotNull(result);
        assertEquals(429, result.getStatusCode().value());
        assertNotNull(result.getBody());
        assertEquals("Rate limit exceeded", result.getBody().message());
        assertFalse(result.getBody().isSuccess());
    }

    @Test
    void constructor_withStatusOnly_createsInstance() {
        ApiRes result = new ApiRes(HttpStatus.OK);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
    }

    @Test
    void constructor_withBodyAndStatus_createsInstance() {
        Res body = new Res(200, "Test", null, true, java.time.Instant.now());
        ApiRes result = new ApiRes(body, HttpStatus.OK);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertEquals(body, result.getBody());
    }

    @Test
    void constructor_withBodyHeadersAndStatus_createsInstance() {
        Res body = new Res(200, "Test", null, true, java.time.Instant.now());
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Test", "test-value");
        ApiRes result = new ApiRes(body, headers, HttpStatus.OK);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertEquals(body, result.getBody());
        assertEquals("test-value", result.getHeaders().getFirst("X-Test"));
    }

    @Test
    void constructor_withBodyHeadersAndRawStatus_createsInstance() {
        Res body = new Res(200, "Test", null, true, java.time.Instant.now());
        HttpHeaders headers = new HttpHeaders();
        ApiRes result = new ApiRes(body, headers, 200);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertEquals(body, result.getBody());
    }

    @Test
    void constructor_withHeadersAndStatus_createsInstance() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Test", "test-value");
        ApiRes result = new ApiRes(headers, HttpStatus.OK);

        assertNotNull(result);
        assertEquals(200, result.getStatusCode().value());
        assertEquals("test-value", result.getHeaders().getFirst("X-Test"));
    }
}
