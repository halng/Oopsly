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

package com.app.oopsly.api.garden.domain;

import com.app.oopsly.api.shared.domain.Audit;
import com.app.oopsly.api.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

/** A completed (or recorded) Pomodoro session. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "pomodoro_sessions")
@Entity
public class PomodoroSessionEntity extends Audit {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(nullable = false)
    private Integer focusDurationMinutes;

    @Builder.Default private Integer breakDurationMinutes = 5;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SessionMode mode = SessionMode.FOCUS;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Soundscape soundscape = Soundscape.NONE;

    @Builder.Default private Integer xpGained = 0;
    @Builder.Default private Integer growthPointsGained = 0;

    @Builder.Default private Instant completedAt = Instant.now();
}
