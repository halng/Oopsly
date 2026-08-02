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

package com.app.oopsly.api.unit.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.ShelfController;
import com.app.oopsly.api.service.ShelfService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.ShelfReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShelveControllerTest {

    @Mock private ShelfService shelfService;

    @InjectMocks private ShelfController shelveController;

    private ShelfReq shelfReq;
    private UUID shelveId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        shelfReq =
                new ShelfReq(
                        "code",
                        "Test Shelve",
                        "Test description with sufficient length to meet validation requirements");
        shelveId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToShelveService() {
        when(shelfService.create(shelfReq)).thenReturn(expectedResponse);

        ApiRes result = shelveController.create(shelfReq);

        assertSame(expectedResponse, result);
        verify(shelfService, times(1)).create(shelfReq);
    }

    @Test
    void update_delegatesToShelveService() {
        when(shelfService.update(shelfReq, shelveId)).thenReturn(expectedResponse);

        ApiRes result = shelveController.update(shelfReq, shelveId);

        assertSame(expectedResponse, result);
        verify(shelfService, times(1)).update(shelfReq, shelveId);
    }

    @Test
    void getById_delegatesToShelveService() {
        when(shelfService.getById(shelveId)).thenReturn(expectedResponse);

        ApiRes result = shelveController.getById(shelveId);

        assertSame(expectedResponse, result);
        verify(shelfService, times(1)).getById(shelveId);
    }

    @Test
    void deleteById_delegatesToShelveService() {
        when(shelfService.delete(shelveId)).thenReturn(expectedResponse);

        ApiRes result = shelveController.deleteById(shelveId);

        assertSame(expectedResponse, result);
        verify(shelfService, times(1)).delete(shelveId);
    }

    @Test
    void getAll_delegatesToShelveService() {
        int page = 0;
        int size = 10;
        when(shelfService.getAll(page, size)).thenReturn(expectedResponse);

        ApiRes result = shelveController.getAll(page, size);

        assertSame(expectedResponse, result);
        verify(shelfService, times(1)).getAll(page, size);
    }
}
