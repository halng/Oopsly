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

package com.app.oopsly.api.unit.card.interfaces.rest;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.app.oopsly.api.card.CardService;
import com.app.oopsly.api.card.DuePracticeController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DuePracticeControllerTest {

    @Mock private CardService cardService;

    @InjectMocks private DuePracticeController controller;

    @Test
    void getDueCards_delegatesToCardService() {
        ApiRes expected = ApiRes.success("Fetched successfully", List.of());
        when(cardService.getDueCardsForCurrentUser()).thenReturn(expected);

        ApiRes result = controller.getDueCards();

        assertSame(expected, result);
        verify(cardService).getDueCardsForCurrentUser();
    }
}
