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
import java.util.List;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "subjects")
@Entity
public class SubjectEntity extends Audit {

    private String name;
    private String description;

    @Builder.Default private Integer dailyLimit = 20;
    @Builder.Default private Integer newCardsPerDay = 5;
    @Builder.Default private Double interval = 1.0;
    @Builder.Default private Boolean isPublic = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_id", nullable = false)
    private ShelfEntity shelf;

    @JsonIgnore
    @OneToMany(mappedBy = "subject", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<CardEntity> cards;

    @ManyToMany(mappedBy = "subjects")
    private List<TestSuiteEntity> testSuites;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_subject_id")
    private SubjectEntity parentSubject;
}
