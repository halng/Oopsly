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

package com.app.oopsly.api.shelf;

import com.app.oopsly.api.shared.domain.Audit;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.util.List;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "shelves")
@Entity
public class Shelf extends Audit {

    @Column(length = 100)
    private String icon;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 225, nullable = false)
    @Builder.Default
    private String slug = "";

    @Column(length = 1000)
    private String description;

    @Column(length = 20)
    @Builder.Default
    private String color = "#FFFFFF";

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JsonIgnore
    @OneToMany(mappedBy = "shelf", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestSuiteEntity> testSuites;

    @JsonIgnore
    @OneToMany(mappedBy = "shelf", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<Subject> subjects;
}
