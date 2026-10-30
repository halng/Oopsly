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

package com.app.oopsly.api.unit.testsuite.application;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.testsuite.application.vm.BulkQuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class BulkQuestionReqTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private static QuestionReq valid() {
        return new QuestionReq(
                "2+2?", QuestionType.SINGLE_CHOICE, List.of("3", "4"), 1, null, null, null, null);
    }

    @Test
    void acceptsBetweenOneAndTheMaximum() {
        assertTrue(validator.validate(new BulkQuestionReq(List.of(valid()))).isEmpty());
        List<QuestionReq> max = new ArrayList<>();
        for (int i = 0; i < BulkQuestionReq.MAX_QUESTIONS; i++) {
            max.add(valid());
        }
        assertTrue(validator.validate(new BulkQuestionReq(max)).isEmpty());
    }

    @Test
    void rejectsNullAndEmptyLists() {
        assertFalse(validator.validate(new BulkQuestionReq(null)).isEmpty());
        assertFalse(validator.validate(new BulkQuestionReq(List.of())).isEmpty());
    }

    @Test
    void rejectsMoreThanTheMaximum() {
        List<QuestionReq> tooMany = new ArrayList<>();
        for (int i = 0; i <= BulkQuestionReq.MAX_QUESTIONS; i++) {
            tooMany.add(valid());
        }
        assertFalse(validator.validate(new BulkQuestionReq(tooMany)).isEmpty());
    }

    @Test
    void rejectsNullElementsAndInvalidNestedQuestions() {
        assertFalse(
                validator.validate(new BulkQuestionReq(Arrays.asList(valid(), null))).isEmpty());
        QuestionReq blankText =
                new QuestionReq(" ", QuestionType.TRUE_FALSE, null, 0, null, null, null, null);
        assertFalse(validator.validate(new BulkQuestionReq(List.of(blankText))).isEmpty());
    }
}
