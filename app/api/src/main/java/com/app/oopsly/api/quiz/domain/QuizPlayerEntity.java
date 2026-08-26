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

package com.app.oopsly.api.quiz.domain;

import com.app.oopsly.api.shared.domain.Audit;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

/** A participant of a live quiz room. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "quiz_players")
@Entity
public class QuizPlayerEntity extends Audit {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private QuizSessionEntity session;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String displayName;

    @Column(name = "session_key", nullable = false)
    private String sessionKey;

    @Builder.Default private Integer score = 0;

    private String currentAnswer;

    @Builder.Default private Instant joinedAt = Instant.now();
}
