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

import com.app.oopsly.api.controller.QuestionController;
import com.app.oopsly.api.entity.QuestionType;
import com.app.oopsly.api.service.QuestionService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.QuestionReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QuestionControllerTest {

    @Mock private QuestionService questionService;

    @InjectMocks private QuestionController questionController;

    private QuestionReq questionReq;
    private UUID testSuiteId;
    private UUID questionId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        String metadata = "{\"options\":[\"A\",\"B\",\"C\"],\"correct_indices\":[0,2]}";
        questionReq = new QuestionReq("What is 2+2?", QuestionType.MULTIPLE_CHOICE, metadata);
        testSuiteId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToQuestionService() {
        when(questionService.create(testSuiteId, questionReq)).thenReturn(expectedResponse);

        ApiRes result = questionController.create(testSuiteId, questionReq);

        assertSame(expectedResponse, result);
        verify(questionService, times(1)).create(testSuiteId, questionReq);
    }

    @Test
    void update_delegatesToQuestionService() {
        when(questionService.update(testSuiteId, questionId, questionReq))
                .thenReturn(expectedResponse);

        ApiRes result = questionController.update(testSuiteId, questionId, questionReq);

        assertSame(expectedResponse, result);
        verify(questionService, times(1)).update(testSuiteId, questionId, questionReq);
    }

    @Test
    void getById_delegatesToQuestionService() {
        when(questionService.getById(testSuiteId, questionId)).thenReturn(expectedResponse);

        ApiRes result = questionController.getById(testSuiteId, questionId);

        assertSame(expectedResponse, result);
        verify(questionService, times(1)).getById(testSuiteId, questionId);
    }

    @Test
    void deleteById_delegatesToQuestionService() {
        when(questionService.delete(testSuiteId, questionId)).thenReturn(expectedResponse);

        ApiRes result = questionController.deleteById(testSuiteId, questionId);

        assertSame(expectedResponse, result);
        verify(questionService, times(1)).delete(testSuiteId, questionId);
    }

    @Test
    void getAllByTestSuite_delegatesToQuestionService() {
        when(questionService.getAllByTestSuite(testSuiteId)).thenReturn(expectedResponse);

        ApiRes result = questionController.getAllByTestSuite(testSuiteId);

        assertSame(expectedResponse, result);
        verify(questionService, times(1)).getAllByTestSuite(testSuiteId);
    }
}
