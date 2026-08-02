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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "test_suites")
@Entity
public class TestSuiteEntity extends Audit {

    private String title;

    private Boolean isActive;

    private Integer highestScore;

    @JdbcTypeCode(SqlTypes.JSON)
    private TestSuiteSelectionPayload selection;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_id", nullable = false)
    private ShelfEntity shelf;

    @OneToMany(mappedBy = "testSuite", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuestionEntity> questions;

    @ManyToMany
    @JoinTable(
            name = "test_suite_subjects",
            joinColumns = @JoinColumn(name = "test_suite_id"),
            inverseJoinColumns = @JoinColumn(name = "subject_id"))
    private List<SubjectEntity> subjects;
}
