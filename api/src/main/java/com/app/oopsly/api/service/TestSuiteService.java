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

package com.app.oopsly.api.service;

import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TestSuiteReq;
import java.util.UUID;

public interface TestSuiteService {
    ApiRes create(UUID shelveId, TestSuiteReq request);

    ApiRes update(UUID shelveId, UUID testSuiteId, TestSuiteReq request);

    ApiRes delete(UUID shelveId, UUID testSuiteId);

    ApiRes getById(UUID shelveId, UUID testSuiteId);

    ApiRes getAllByShelve(UUID shelveId);

    /** Resolves flashcards from the preset (read-only; does not change SRS schedules). */
    ApiRes run(UUID shelveId, UUID testSuiteId);

    ApiRes autoGenerate(UUID shelveId, UUID subjectId, int numQuestions);
}
