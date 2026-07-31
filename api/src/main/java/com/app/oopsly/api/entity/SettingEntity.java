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
import java.util.Map;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.relational.core.mapping.Table;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "settings")
@Entity(name = "settings")
public class SettingEntity extends Audit {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Theme theme;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Language language;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "space_config", nullable = false)
    private Map<String, Integer> spaceConfig;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "study_schedule")
    private StudySchedule studySchedule;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;
}
