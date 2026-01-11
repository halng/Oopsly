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

package com.app.oopsly.api.repository;

import com.app.oopsly.api.entity.QuestionEntity;
import com.app.oopsly.api.entity.TestSuiteEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface QuestionRepository extends JpaRepository<QuestionEntity, UUID> {
    @Query(
            "SELECT q FROM QuestionEntity q WHERE q.id = ?1 AND q.testSuite = ?2 AND q.deleted ="
                    + " false")
    Optional<QuestionEntity> findByIdAndTestSuite(UUID id, TestSuiteEntity testSuite);

    @Query("SELECT q FROM QuestionEntity q WHERE q.testSuite = ?1 AND q.deleted = false")
    List<QuestionEntity> findAllByTestSuite(TestSuiteEntity testSuite);
}
