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

package com.app.oopsly.api.stats.domain;

import com.app.oopsly.api.shared.domain.Audit;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

/** Immutable log of a single card review, backbone of the statistics context. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "review_logs")
@Entity
public class ReviewLogEntity extends Audit {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "card_id", nullable = false)
    private UUID cardId;

    @Column(name = "subject_id")
    private UUID subjectId;

    @Column(nullable = false)
    private Integer grade;

    @Builder.Default private Integer xpGained = 0;
    @Builder.Default private Integer intervalDays = 0;
    @Builder.Default private Double stability = 0.0;
    @Builder.Default private Double difficulty = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private Instant reviewedAt = Instant.now();
}
