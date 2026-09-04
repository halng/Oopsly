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
import jakarta.persistence.*;
import lombok.*;

/** A single plot of land inside a garden. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "garden_land_plots",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_garden_plot_index",
                        columnNames = {"garden_id", "plot_index"}))
@Entity
public class LandPlotEntity extends Audit {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garden_id", nullable = false)
    private GardenStateEntity garden;

    @Column(name = "plot_index", nullable = false)
    private Integer plotIndex;

    @Builder.Default private Boolean isUnlocked = false;

    @Builder.Default private Integer unlockCost = 0;
}
