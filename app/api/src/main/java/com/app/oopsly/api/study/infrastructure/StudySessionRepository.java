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

package com.app.oopsly.api.study.infrastructure;

import com.app.oopsly.api.study.domain.StudySessionEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySessionEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            "SELECT session FROM StudySessionEntity session WHERE session.id = :sessionId "
                    + "AND session.userId = :userId AND session.subjectId = :subjectId "
                    + "AND session.completedAt IS NULL")
    Optional<StudySessionEntity> findUncompletedForUpdate(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId,
            @Param("subjectId") UUID subjectId);
}
