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

package com.app.oopsly.api.testsuite.application;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.testsuite.application.vm.BulkQuestionReq;
import com.app.oopsly.api.testsuite.application.vm.QuestionReq;
import java.util.UUID;

/** Question CRUD; every call checks that the shelf belongs to the current user. */
public interface QuestionService {
    ApiRes create(UUID shelveId, UUID testSuiteId, QuestionReq request);

    /** Adds every question or none; an invalid question fails the whole call. */
    ApiRes createBulk(UUID shelveId, UUID testSuiteId, BulkQuestionReq request);

    ApiRes update(UUID shelveId, UUID testSuiteId, UUID questionId, QuestionReq request);

    ApiRes delete(UUID shelveId, UUID testSuiteId, UUID questionId);

    ApiRes getById(UUID shelveId, UUID testSuiteId, UUID questionId);

    ApiRes getAllByTestSuite(UUID shelveId, UUID testSuiteId);
}
