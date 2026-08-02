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

import com.app.oopsly.api.controller.DiscoverController;
import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DiscoverControllerTest {

    @Mock private SubjectService subjectService;
    @InjectMocks private DiscoverController discoverController;

    @Test
    void discoverPublicDecks_delegates() {
        ApiRes expected = ApiRes.success("ok");
        when(subjectService.discoverPublicDecks("java", 0, 20)).thenReturn(expected);
        assertSame(expected, discoverController.discoverPublicDecks("java", 0, 20));
        verify(subjectService).discoverPublicDecks("java", 0, 20);
    }

    @Test
    void cloneDeck_delegates() {
        UUID subjectId = UUID.randomUUID();
        ApiRes expected = ApiRes.created("ok");
        when(subjectService.cloneDeck(subjectId)).thenReturn(expected);
        assertSame(expected, discoverController.cloneDeck(subjectId));
        verify(subjectService).cloneDeck(subjectId);
    }
}
