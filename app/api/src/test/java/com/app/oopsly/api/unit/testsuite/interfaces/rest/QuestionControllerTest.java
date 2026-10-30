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

package com.app.oopsly.api.unit.testsuite.interfaces.rest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.testsuite.application.QuestionService;
import com.app.oopsly.api.testsuite.application.vm.BulkQuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.interfaces.rest.QuestionController;
import java.util.List;
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
    private UUID shelveId;
    private UUID testSuiteId;
    private UUID questionId;
    private ApiRes expectedResponse;

    @BeforeEach
    void setUp() {
        questionReq =
                new QuestionReq(
                        "Pick the primes",
                        QuestionType.MULTIPLE_CHOICE,
                        List.of("2", "3", "4"),
                        null,
                        List.of(0, 1),
                        null,
                        null,
                        null);
        shelveId = UUID.randomUUID();
        testSuiteId = UUID.randomUUID();
        questionId = UUID.randomUUID();
        expectedResponse = ApiRes.success("Success");
    }

    @Test
    void create_delegatesToQuestionService() {
        when(questionService.create(shelveId, testSuiteId, questionReq))
                .thenReturn(expectedResponse);

        assertSame(expectedResponse, questionController.create(shelveId, testSuiteId, questionReq));
    }

    @Test
    void createBulk_delegatesToQuestionService() {
        BulkQuestionReq bulk = new BulkQuestionReq(List.of(questionReq));
        when(questionService.createBulk(shelveId, testSuiteId, bulk)).thenReturn(expectedResponse);

        assertSame(expectedResponse, questionController.createBulk(shelveId, testSuiteId, bulk));
    }

    @Test
    void update_delegatesToQuestionService() {
        when(questionService.update(shelveId, testSuiteId, questionId, questionReq))
                .thenReturn(expectedResponse);

        assertSame(
                expectedResponse,
                questionController.update(shelveId, testSuiteId, questionId, questionReq));
    }

    @Test
    void getById_delegatesToQuestionService() {
        when(questionService.getById(shelveId, testSuiteId, questionId))
                .thenReturn(expectedResponse);

        assertSame(expectedResponse, questionController.getById(shelveId, testSuiteId, questionId));
    }

    @Test
    void deleteById_delegatesToQuestionService() {
        when(questionService.delete(shelveId, testSuiteId, questionId))
                .thenReturn(expectedResponse);

        assertSame(
                expectedResponse, questionController.deleteById(shelveId, testSuiteId, questionId));
    }

    @Test
    void getAllByTestSuite_delegatesToQuestionService() {
        when(questionService.getAllByTestSuite(shelveId, testSuiteId)).thenReturn(expectedResponse);

        assertSame(expectedResponse, questionController.getAllByTestSuite(shelveId, testSuiteId));
    }
}
