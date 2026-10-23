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

package com.app.oopsly.api.progress;

import com.app.oopsly.api.shared.domain.Audit;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Learning progress of one user (XP, streak, league). Profile data lives in the auth service. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "user_progress")
@Entity
public class UserProgress extends Audit {

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Builder.Default private Integer totalXp = 0;
    @Builder.Default private Integer dailyStreak = 0;

    private Instant lastReviewedAt;

    @Column(length = 50)
    @Builder.Default
    private String league = "BRONZE";

    @Builder.Default private Double retentionRate = 0.0;
    @Builder.Default private Integer totalReviews = 0;
    @Builder.Default private Integer totalCardsStudied = 0;
}
