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

package com.app.oopsly.api.testsuite.application.vm;

import com.app.oopsly.api.shared.util.AnswerMatcher;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Submission of a finished test run, keyed by question id.
 *
 * @param answers selected option index for single choice and True/False
 * @param multiAnswers selected option indexes for multiple choice
 * @param textAnswers typed answer for fill in the blank
 */
public record TestSubmissionReq(
        Map<UUID, Integer> answers,
        Map<UUID, List<Integer>> multiAnswers,
        Map<UUID, @Size(max = AnswerMatcher.MAX_ANSWER_LENGTH) String> textAnswers,
        @Min(0) Integer timeSpentSeconds) {}
