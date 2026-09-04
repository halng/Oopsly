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

package com.app.oopsly.api.garden.application.vm;

import com.app.oopsly.api.garden.domain.GardenWeather;
import com.app.oopsly.api.garden.domain.PlantSpecies;
import java.util.List;
import java.util.Map;

/** Full garden state as consumed by the UI. */
public record GardenStateRes(
        List<LandPlotRes> plots,
        List<PlantedTreeRes> plantedTrees,
        int dewDrops,
        int sunlightOrbs,
        int growthPoints,
        int forestCoins,
        Map<PlantSpecies, Integer> seedInventory,
        int forestLevel,
        int totalFocusMinutes,
        int completedSessionsCount,
        int totalXpContributed,
        GardenWeather activeWeather) {}
