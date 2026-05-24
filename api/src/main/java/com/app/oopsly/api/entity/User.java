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

import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import lombok.*;
import org.springframework.data.relational.core.mapping.Table;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
@Entity(name = "users")
public class User extends Audit {
    private String name;

    @Column(unique = true)
    private String hashedPassword;

    @Column(unique = true, nullable = false)
    private String email;

    private String pictureUrl;

    @Column(name = "display_name", length = 50)
    private String displayName;

    @Column(length = 255)
    private String bio;

    @Column private Integer age;

    @Builder.Default private Integer dailyStreak = 0;
    @Builder.Default private Integer totalXp = 0;

    private Instant lastReviewedAt;

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<ShelfEntity> shelves;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private SettingEntity setting;
}
