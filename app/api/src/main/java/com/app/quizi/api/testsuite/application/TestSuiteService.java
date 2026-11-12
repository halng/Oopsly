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

package com.app.quizi.api.testsuite.application;

import com.app.quizi.api.shared.application.vm.ApiRes;
import com.app.quizi.api.testsuite.application.vm.TestSubmissionReq;
import com.app.quizi.api.testsuite.application.vm.TestSuiteReq;
import java.util.UUID;

public interface TestSuiteService {
    ApiRes create(UUID shelveId, TestSuiteReq request);

    ApiRes update(UUID shelveId, UUID testSuiteId, TestSuiteReq request);

    ApiRes delete(UUID shelveId, UUID testSuiteId);

    ApiRes getById(UUID shelveId, UUID testSuiteId);

    ApiRes getAllByShelve(UUID shelveId, int page, int size);

    /** Returns the questions of a suite without their answers, for taking the test. */
    ApiRes getAttempt(UUID shelveId, UUID testSuiteId);

    /** Grades a finished test run, awards XP and returns a per-question breakdown. */
    ApiRes submit(UUID shelveId, UUID testSuiteId, TestSubmissionReq request);

    /** Public test suites of every user, optionally filtered by title or description. */
    ApiRes discoverPublic(String query, int page, int size);

    /** Copies a public test suite and its questions into one of the current user's shelves. */
    ApiRes cloneSuite(UUID testSuiteId, UUID shelfId);
}
