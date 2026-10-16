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

package com.app.oopsly.api.study.domain;

import com.app.oopsly.api.shared.domain.Audit;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

/** A server-tracked Learn or Match session. Does not affect FSRS scheduling. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "study_sessions")
@Entity
public class StudySessionEntity extends Audit {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StudyMode mode;

    @Builder.Default private Integer totalItems = 0;
    @Builder.Default private Integer correctCount = 0;
    @Builder.Default private Integer mistakes = 0;
    @Builder.Default private Integer durationSeconds = 0;
    @Builder.Default private Integer xpGained = 0;

    private Instant completedAt;
}
