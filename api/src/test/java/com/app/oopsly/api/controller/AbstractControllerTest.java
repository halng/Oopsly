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

package com.app.oopsly.api.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.service.Service;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AbstractControllerTest {

    @Mock private Service<TestEntity, TestRequest> service;

    private TestController controller;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        controller = new TestController(service);
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToService() {
        TestRequest request = new TestRequest("test");
        when(service.create(request)).thenReturn(expectedResponse);

        ApiRes result = controller.create(request);

        assertSame(expectedResponse, result);
        verify(service, times(1)).create(request);
    }

    @Test
    void update_delegatesToService() {
        UUID id = UUID.randomUUID();
        TestRequest request = new TestRequest("test");
        when(service.update(request, id)).thenReturn(expectedResponse);

        ApiRes result = controller.update(request, id);

        assertSame(expectedResponse, result);
        verify(service, times(1)).update(request, id);
    }

    @Test
    void getById_delegatesToService() {
        UUID id = UUID.randomUUID();
        when(service.getById(id)).thenReturn(expectedResponse);

        ApiRes result = controller.getById(id);

        assertSame(expectedResponse, result);
        verify(service, times(1)).getById(id);
    }

    @Test
    void deleteById_delegatesToService() {
        UUID id = UUID.randomUUID();
        when(service.delete(id)).thenReturn(expectedResponse);

        ApiRes result = controller.deleteById(id);

        assertSame(expectedResponse, result);
        verify(service, times(1)).delete(id);
    }

    @Test
    void getAll_withValidParams_delegatesToService() {
        int page = 0;
        int size = 10;
        when(service.getAll(page, size)).thenReturn(expectedResponse);

        ApiRes result = controller.getAll(page, size);

        assertSame(expectedResponse, result);
        verify(service, times(1)).getAll(page, size);
    }

    @Test
    void getAll_withNegativePage_throwsException() {
        int page = -1;
        int size = 10;

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> controller.getAll(page, size));
        assertTrue(exception.getMessage().contains("greater than 0"));
        verify(service, never()).getAll(any(Integer.class), any(Integer.class));
    }

    @Test
    void getAll_withZeroSize_throwsException() {
        int page = 0;
        int size = 0;

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> controller.getAll(page, size));
        assertTrue(exception.getMessage().contains("greater than 0"));
        verify(service, never()).getAll(any(Integer.class), any(Integer.class));
    }

    @Test
    void getAll_withNegativeSize_throwsException() {
        int page = 0;
        int size = -5;

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> controller.getAll(page, size));
        assertTrue(exception.getMessage().contains("greater than 0"));
        verify(service, never()).getAll(any(Integer.class), any(Integer.class));
    }

    @Test
    void getAll_withEdgeValues_validatesCorrectly() {
        // Test minimum valid values
        when(service.getAll(0, 1)).thenReturn(expectedResponse);
        ApiRes result = controller.getAll(0, 1);
        assertSame(expectedResponse, result);

        // Test large valid values
        when(service.getAll(1000, 100)).thenReturn(expectedResponse);
        result = controller.getAll(1000, 100);
        assertSame(expectedResponse, result);
    }

    // Test concrete implementation for testing
    private static class TestController extends AbstractController<TestEntity, TestRequest> {
        public TestController(Service service) {
            super(service);
        }
    }

    // Test entity
    private static class TestEntity {}

    // Test request
    private record TestRequest(String value) {}
}
