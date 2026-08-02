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

import com.app.oopsly.api.controller.SubjectController;
import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectReq;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SubjectControllerTest {

    @Mock private SubjectService subjectService;

    @InjectMocks private SubjectController subjectController;

    private SubjectReq subjectReq;
    private UUID shelveId;
    private UUID subjectId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        subjectReq = new SubjectReq("Test Subject", "Test Description");
        shelveId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToSubjectService() {
        when(subjectService.create(shelveId, subjectReq)).thenReturn(expectedResponse);

        ApiRes result = subjectController.create(shelveId, subjectReq);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).create(shelveId, subjectReq);
    }

    @Test
    void getAllByShelve_delegatesToSubjectService() {
        int page = 0;
        int size = 10;
        when(subjectService.getAllByShelve(shelveId, page, size)).thenReturn(expectedResponse);

        ApiRes result = subjectController.getAllByShelve(shelveId, page, size);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).getAllByShelve(shelveId, page, size);
    }

    @Test
    void getAllByShelve_withValidPageAndSize_delegatesToSubjectService() {
        int page = 1;
        int size = 20;
        when(subjectService.getAllByShelve(shelveId, page, size)).thenReturn(expectedResponse);

        ApiRes result = subjectController.getAllByShelve(shelveId, page, size);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).getAllByShelve(shelveId, page, size);
    }

    @Test
    void update_delegatesToSubjectService() {
        when(subjectService.update(shelveId, subjectId, subjectReq)).thenReturn(expectedResponse);

        ApiRes result = subjectController.update(shelveId, subjectId, subjectReq);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).update(shelveId, subjectId, subjectReq);
    }

    @Test
    void getById_delegatesToSubjectService() {
        when(subjectService.getById(shelveId, subjectId)).thenReturn(expectedResponse);

        ApiRes result = subjectController.getById(shelveId, subjectId);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).getById(shelveId, subjectId);
    }

    @Test
    void delete_delegatesToSubjectService() {
        when(subjectService.delete(shelveId, subjectId)).thenReturn(expectedResponse);

        ApiRes result = subjectController.delete(shelveId, subjectId);

        assertSame(expectedResponse, result);
        verify(subjectService, times(1)).delete(shelveId, subjectId);
    }

    @Test
    void updateSetting_delegatesToSubjectService() {
        SubjectSettingReq req = new SubjectSettingReq(20, 10, 1.0);
        when(subjectService.updateSetting(shelveId, subjectId, req)).thenReturn(expectedResponse);

        ApiRes result = subjectController.updateSetting(shelveId, subjectId, req);

        assertSame(expectedResponse, result);
        verify(subjectService).updateSetting(shelveId, subjectId, req);
    }
}
