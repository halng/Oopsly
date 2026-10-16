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

package com.app.oopsly.api.unit.study.interfaces.rest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.study.application.StudySessionService;
import com.app.oopsly.api.study.application.vm.StudySessionReq;
import com.app.oopsly.api.study.application.vm.StudySessionStartReq;
import com.app.oopsly.api.study.application.vm.StudySessionStartRes;
import com.app.oopsly.api.study.domain.StudyMode;
import com.app.oopsly.api.study.interfaces.rest.StudySessionController;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudySessionControllerTest {

    @Mock private StudySessionService studySessionService;
    @InjectMocks private StudySessionController controller;

    @Test
    void start_delegates() {
        UUID shelfId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        StudySessionStartReq req = new StudySessionStartReq(StudyMode.LEARN);
        ApiRes expected = ApiRes.created("started", new StudySessionStartRes(UUID.randomUUID(), 3));
        when(studySessionService.start(shelfId, subjectId, req)).thenReturn(expected);

        assertSame(expected, controller.start(shelfId, subjectId, req));
    }

    @Test
    void record_delegates() {
        UUID shelfId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        StudySessionReq req = new StudySessionReq(UUID.randomUUID(), StudyMode.LEARN, 3, 3, 0, 30);
        ApiRes expected = ApiRes.created("ok");
        when(studySessionService.record(shelfId, subjectId, req)).thenReturn(expected);

        assertSame(expected, controller.record(shelfId, subjectId, req));
    }
}
