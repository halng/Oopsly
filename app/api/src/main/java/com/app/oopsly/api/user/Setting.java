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

package com.app.oopsly.api.user;

import com.app.oopsly.api.shared.domain.Audit;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "settings")
@Entity(name = "settings")
public class Setting extends Audit {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Theme theme;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Language language;

    @Builder.Default private Integer dailyGoal = 20;
    @Builder.Default private Double targetRetentionRate = 0.8;
    @Builder.Default private Boolean soundEffectsEnabled = true;
    @Builder.Default private Boolean hapticFeedbackEnabled = true;
    @Builder.Default private Boolean autoPlayAudio = false;
    @Builder.Default private Boolean allowReminders = true;
    @Builder.Default private Boolean isNewComer = true;
    @Builder.Default private Integer dailyStreak = 0;
    @Builder.Default private Integer totalXp = 0;

    private Instant lastReviewedAt;

    @Column(length = 50)
    @Builder.Default
    private String league = "BRONZE";

    @Builder.Default private Double retentionRate = 0.0;
    @Builder.Default private Integer totalReviews = 0;
    @Builder.Default private Integer totalCardsStudied = 0;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;
}
