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

package com.app.oopsly.api.subject;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.shared.domain.Audit;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.tag.Tag;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
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
public class Subject extends Audit {

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(length = 100)
    private String icon;

    @Column(length = 20)
    @Builder.Default
    private String color = "#FFFFFF";

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String slug = "";

    @Builder.Default private Integer dailyLimit = 20;
    @Builder.Default private Integer newCardsPerDay = 5;
    @Builder.Default private Double interval = 1.0;
    @Builder.Default private Boolean isPublic = false;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_id", nullable = false)
    private Shelf shelf;

    @JsonIgnore
    @OneToMany(mappedBy = "subject", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Card> cards;

    @ManyToMany(mappedBy = "subjects")
    private List<TestSuiteEntity> testSuites;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "subjects_tags",
            joinColumns = @JoinColumn(name = "subject_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private List<Tag> tags;
}
