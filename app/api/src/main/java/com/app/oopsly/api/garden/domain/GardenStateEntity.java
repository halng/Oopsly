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

package com.app.oopsly.api.garden.domain;

import com.app.oopsly.api.shared.domain.Audit;
import com.app.oopsly.api.user.User;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Aggregate root holding the whole forest of one learner. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "garden_states")
@Entity
public class GardenStateEntity extends Audit {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default private Integer dewDrops = 0;
    @Builder.Default private Integer sunlightOrbs = 0;
    @Builder.Default private Integer growthPoints = 0;
    @Builder.Default private Integer forestCoins = 0;
    @Builder.Default private Integer forestLevel = 1;
    @Builder.Default private Integer totalFocusMinutes = 0;
    @Builder.Default private Integer completedSessionsCount = 0;
    @Builder.Default private Integer totalXpContributed = 0;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GardenWeather activeWeather = GardenWeather.SUNNY;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "seed_inventory")
    @Builder.Default
    private Map<PlantSpecies, Integer> seedInventory = new EnumMap<>(PlantSpecies.class);

    @Builder.Default
    @OneToMany(mappedBy = "garden", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<LandPlotEntity> plots = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "garden", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlantedTreeEntity> plantedTrees = new ArrayList<>();
}
