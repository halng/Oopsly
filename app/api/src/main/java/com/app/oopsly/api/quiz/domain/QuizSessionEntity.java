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
import com.app.oopsly.api.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.*;

/** Persisted live quiz room (results survive the session). */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "quiz_sessions")
@Entity
public class QuizSessionEntity extends Audit {

    @Column(name = "room_code", nullable = false, unique = true, length = 6)
    private String roomCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private User host;

    @Column(name = "subject_id")
    private UUID subjectId;

    private String subjectTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private QuizState state = QuizState.LOBBY;

    @Builder.Default private Integer currentQuestionIndex = -1;

    private Instant questionStartedAt;

    @Builder.Default private Instant startedAt = Instant.now();

    private Instant finishedAt;

    @Builder.Default
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizPlayerEntity> players = new ArrayList<>();
}
