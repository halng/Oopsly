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

package com.app.oopsly.api.unit.garden.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.garden.domain.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("Garden domain")
class GardenDomainTest {

    @Test
    @DisplayName("next should advance the stage when the plant grows and saturate at ANCIENT")
    void next_shouldAdvanceStage_whenPlantGrows() {
        assertEquals(PlantStage.SPROUT, PlantStage.SEED.next());
        assertEquals(PlantStage.SAPLING, PlantStage.SPROUT.next());
        assertEquals(PlantStage.BLOOMING, PlantStage.SAPLING.next());
        assertEquals(PlantStage.ANCIENT, PlantStage.BLOOMING.next());
        assertEquals(PlantStage.ANCIENT, PlantStage.ANCIENT.next());
    }

    @Test
    @DisplayName("values should expose the documented constants when the enums are inspected")
    void values_shouldExposeDocumentedConstants_whenEnumsAreInspected() {
        assertEquals(5, PlantStage.values().length);
        assertEquals(8, PlantSpecies.values().length);
        assertEquals(3, GardenWeather.values().length);
        assertEquals(3, SessionMode.values().length);
        assertEquals(6, Soundscape.values().length);
        assertEquals(PlantSpecies.CAMPHOR_TREE, PlantSpecies.valueOf("CAMPHOR_TREE"));
        assertEquals(GardenWeather.SUNNY, GardenWeather.valueOf("SUNNY"));
        assertEquals(SessionMode.LONG_BREAK, SessionMode.valueOf("LONG_BREAK"));
        assertEquals(Soundscape.NONE, Soundscape.valueOf("NONE"));
    }

    @Test
    @DisplayName("builder should apply safe defaults when a garden is created without values")
    void builder_shouldApplySafeDefaults_whenGardenIsCreatedWithoutValues() {
        GardenStateEntity garden = GardenStateEntity.builder().build();

        assertEquals(0, garden.getDewDrops());
        assertEquals(0, garden.getSunlightOrbs());
        assertEquals(0, garden.getGrowthPoints());
        assertEquals(0, garden.getForestCoins());
        assertEquals(1, garden.getForestLevel());
        assertEquals(0, garden.getTotalFocusMinutes());
        assertEquals(0, garden.getCompletedSessionsCount());
        assertEquals(0, garden.getTotalXpContributed());
        assertEquals(GardenWeather.SUNNY, garden.getActiveWeather());
        assertTrue(garden.getSeedInventory().isEmpty());
        assertTrue(garden.getPlots().isEmpty());
        assertTrue(garden.getPlantedTrees().isEmpty());
    }

    @Test
    @DisplayName("builder should lock the plot for free when a land plot is created")
    void builder_shouldLockPlotForFree_whenLandPlotIsCreated() {
        LandPlotEntity plot = LandPlotEntity.builder().plotIndex(4).build();
        assertFalse(plot.getIsUnlocked());
        assertEquals(0, plot.getUnlockCost());
        assertEquals(4, plot.getPlotIndex());
    }

    @Test
    @DisplayName("builder should start at the SEED stage when a tree is planted")
    void builder_shouldStartAtSeedStage_whenTreeIsPlanted() {
        PlantedTreeEntity tree =
                PlantedTreeEntity.builder()
                        .plotIndex(0)
                        .species(PlantSpecies.SKY_BONSAI)
                        .nickname("Bonzo")
                        .build();

        assertEquals(PlantStage.SEED, tree.getStage());
        assertEquals(50, tree.getWaterLevel());
        assertEquals(0, tree.getGrowthProgress());
        assertEquals(0, tree.getTotalWaters());
        assertNotNull(tree.getPlantedAt());
        assertNull(tree.getLastWateredAt());
        assertEquals("Bonzo", tree.getNickname());
    }

    @Test
    @DisplayName("builder should default to FOCUS mode when a pomodoro session is created")
    void builder_shouldDefaultToFocusMode_whenPomodoroSessionIsCreated() {
        UUID subjectId = UUID.randomUUID();
        PomodoroSessionEntity session =
                PomodoroSessionEntity.builder()
                        .focusDurationMinutes(25)
                        .subjectId(subjectId)
                        .build();

        assertEquals(25, session.getFocusDurationMinutes());
        assertEquals(5, session.getBreakDurationMinutes());
        assertEquals(SessionMode.FOCUS, session.getMode());
        assertEquals(Soundscape.NONE, session.getSoundscape());
        assertEquals(0, session.getXpGained());
        assertEquals(0, session.getGrowthPointsGained());
        assertEquals(subjectId, session.getSubjectId());
        assertTrue(session.getCompletedAt().isBefore(Instant.now().plusSeconds(1)));
    }
}
