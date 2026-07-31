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

import com.app.oopsly.api.controller.MediaController;
import com.app.oopsly.api.service.MediaService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.MediaUploadReq;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MediaControllerTest {

    @Mock private MediaService mediaService;
    @InjectMocks private MediaController mediaController;

    @Test
    void getUploadUrl_delegates() {
        UUID shelfId = UUID.randomUUID();
        UUID subjectId = UUID.randomUUID();
        UUID cardId = UUID.randomUUID();
        MediaUploadReq req = new MediaUploadReq("a.png", "image/png");
        ApiRes expected = ApiRes.success("ok");
        when(mediaService.getUploadUrl(shelfId, subjectId, cardId, "a.png", "image/png"))
                .thenReturn(expected);

        assertSame(expected, mediaController.getUploadUrl(shelfId, subjectId, cardId, req));
        verify(mediaService).getUploadUrl(shelfId, subjectId, cardId, "a.png", "image/png");
    }
}
