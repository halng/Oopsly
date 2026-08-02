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

package com.app.oopsly.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table
@Entity(name = "cards")
public class CardEntity extends Audit {

    private String front;
    private String back;

    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficultyLevel;

    private Instant nextPracticeTime;

    @Builder.Default private Integer numberOfPractice = 0;

    @Builder.Default private Double fsrsStability = 0.0;
    @Builder.Default private Double fsrsDifficulty = 0.0;
    @Builder.Default private Integer fsrsIntervalDays = 0;
    @Builder.Default private Integer fsrsRepetitions = 0;

    private Instant lastReviewedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private SubjectEntity subject;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "card_tags",
            joinColumns = @JoinColumn(name = "card_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private List<TagEntity> tags;
}
