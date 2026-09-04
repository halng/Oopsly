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

package com.app.oopsly.api.unit.garden.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.garden.application.GardenServiceImpl;
import com.app.oopsly.api.garden.application.vm.*;
import com.app.oopsly.api.garden.domain.*;
import com.app.oopsly.api.garden.infrastructure.GardenStateRepository;
import com.app.oopsly.api.garden.infrastructure.PomodoroSessionRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.user.application.UserService;
import com.app.oopsly.api.user.domain.User;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class GardenServiceImplTest {

    @Mock private GardenStateRepository gardenStateRepository;
    @Mock private PomodoroSessionRepository pomodoroSessionRepository;
    @Mock private UserService userService;

    @InjectMocks private GardenServiceImpl gardenService;

    private User user;
    private GardenStateEntity garden;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setName("Learner");

        garden = newGarden();
    }

    private GardenStateEntity newGarden() {
        GardenStateEntity entity = GardenStateEntity.builder().user(user).build();
        entity.setId(UUID.randomUUID());
        entity.setPlots(new ArrayList<>());
        entity.setPlantedTrees(new ArrayList<>());
        for (int i = 0; i < GamificationRules.GARDEN_DEFAULT_PLOTS; i++) {
            entity.getPlots()
                    .add(
                            LandPlotEntity.builder()
                                    .garden(entity)
                                    .plotIndex(i)
                                    .isUnlocked(i < GamificationRules.GARDEN_FREE_PLOTS)
                                    .unlockCost(i < GamificationRules.GARDEN_FREE_PLOTS ? 0 : 50)
                                    .build());
        }
        Map<PlantSpecies, Integer> inventory = new EnumMap<>(PlantSpecies.class);
        inventory.put(PlantSpecies.CAMPHOR_TREE, 1);
        entity.setSeedInventory(inventory);
        return entity;
    }

    private void currentUserOwnsGarden() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(gardenStateRepository.findByUserId(user.getId())).thenReturn(Optional.of(garden));
    }

    private static GardenStateRes dataOf(ApiRes response) {
        return (GardenStateRes) response.getBody().data();
    }

    private Object invokePrivate(String name, Class<?>[] types, Object... args) throws Exception {
        Method method = GardenServiceImpl.class.getDeclaredMethod(name, types);
        method.setAccessible(true);
        try {
            return method.invoke(gardenService, args);
        } catch (InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    // ------------------------------------------------------------- getGarden

    @Test
    void getGarden_returnsExistingGardenState() {
        currentUserOwnsGarden();

        ApiRes response = gardenService.getGarden();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isSuccess());
        GardenStateRes state = dataOf(response);
        assertEquals(GamificationRules.GARDEN_DEFAULT_PLOTS, state.plots().size());
        assertTrue(state.plantedTrees().isEmpty());
        assertEquals(GardenWeather.SUNNY, state.activeWeather());
        verify(gardenStateRepository, never()).saveAndFlush(any());
    }

    @Test
    void getGarden_firstAccessCreatesStarterGarden() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(gardenStateRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(gardenStateRepository.saveAndFlush(any(GardenStateEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes response = gardenService.getGarden();

        GardenStateRes state = dataOf(response);
        assertEquals(GamificationRules.GARDEN_DEFAULT_PLOTS, state.plots().size());
        assertEquals(
                GamificationRules.GARDEN_FREE_PLOTS,
                state.plots().stream().filter(LandPlotRes::isUnlocked).count());
        assertEquals(GamificationRules.GARDEN_DEW_PER_SESSION, state.dewDrops());
        assertEquals(1, state.seedInventory().get(PlantSpecies.CAMPHOR_TREE));
        // locked plots have an increasing unlock cost
        assertEquals(
                GamificationRules.GARDEN_PLOT_UNLOCK_COST,
                state.plots().get(GamificationRules.GARDEN_FREE_PLOTS).unlockCost());
        verify(gardenStateRepository).saveAndFlush(any(GardenStateEntity.class));
    }

    @Test
    void getGarden_isScopedToTheAuthenticatedUserOnly() {
        currentUserOwnsGarden();

        gardenService.getGarden();

        verify(gardenStateRepository).findByUserId(user.getId());
        verify(gardenStateRepository, never()).findAll();
    }

    // ------------------------------------------------------------- plantSeed

    @Test
    void plantSeed_consumesSeedAndCreatesTree() {
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.plantSeed(new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 0, "Kodama"));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        GardenStateRes state = dataOf(response);
        assertEquals(1, state.plantedTrees().size());
        assertEquals(PlantStage.SEED, state.plantedTrees().get(0).stage());
        assertEquals("Kodama", state.plantedTrees().get(0).nickname());
        assertEquals(0, state.seedInventory().get(PlantSpecies.CAMPHOR_TREE));
        assertEquals(0, state.plots().get(0).index());
    }

    @Test
    void plantSeed_onLockedPlotIsRejected() {
        currentUserOwnsGarden();

        ValidationException exception =
                assertThrows(
                        ValidationException.class,
                        () ->
                                gardenService.plantSeed(
                                        new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 8, null)));

        assertNotNull(exception.getMessage());
        verify(gardenStateRepository, never()).saveAndFlush(any());
    }

    @Test
    void plantSeed_onOccupiedPlotIsRejected() {
        garden.getPlantedTrees()
                .add(
                        PlantedTreeEntity.builder()
                                .garden(garden)
                                .plotIndex(0)
                                .species(PlantSpecies.CHERRY_BLOSSOM)
                                .build());
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class,
                () ->
                        gardenService.plantSeed(
                                new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 0, null)));
    }

    @Test
    void plantSeed_withoutSeedInInventoryIsRejected() {
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class,
                () -> gardenService.plantSeed(new PlantSeedReq(PlantSpecies.SKY_BONSAI, 0, null)));
    }

    @Test
    void plantSeed_withEmptyInventoryFallsBackToDefaultInventory() {
        garden.setSeedInventory(new EnumMap<>(PlantSpecies.class));
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.plantSeed(new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 1, null));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(0, dataOf(response).seedInventory().get(PlantSpecies.CAMPHOR_TREE));
    }

    @Test
    void plantSeed_withNullInventoryFallsBackToDefaultInventory() {
        garden.setSeedInventory(null);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        assertEquals(
                HttpStatus.CREATED,
                gardenService
                        .plantSeed(new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 2, null))
                        .getStatusCode());
    }

    @Test
    void plantSeed_onUnknownPlotThrowsNotFound() {
        currentUserOwnsGarden();

        assertThrows(
                NotFoundException.class,
                () ->
                        gardenService.plantSeed(
                                new PlantSeedReq(PlantSpecies.CAMPHOR_TREE, 999, null)));
    }

    // ------------------------------------------------------------- waterTree

    @Test
    void waterTree_spendsDewAndGrowsThePlant() {
        PlantedTreeEntity tree = plantedTree(0, PlantStage.SEED, 0, 10);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(20);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.waterTree(new WaterTreeReq(tree.getId()));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        GardenStateRes state = dataOf(response);
        assertEquals(20 - GamificationRules.GARDEN_WATER_DEW_COST, state.dewDrops());
        PlantedTreeRes watered = state.plantedTrees().get(0);
        assertEquals(10 + GamificationRules.GARDEN_WATER_LEVEL_GAIN, watered.waterLevel());
        assertEquals(GamificationRules.GARDEN_WATER_GROWTH_GAIN, watered.growthProgress());
        assertEquals(1, watered.totalWaters());
        assertNotNull(watered.lastWateredAt());
    }

    @Test
    void waterTree_waterLevelIsCappedAt100() {
        PlantedTreeEntity tree = plantedTree(0, PlantStage.SEED, 0, 95);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(50);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.waterTree(new WaterTreeReq(tree.getId()));

        assertEquals(100, dataOf(response).plantedTrees().get(0).waterLevel());
    }

    @Test
    void waterTree_advancesStageWhenThresholdIsCrossed() {
        PlantedTreeEntity tree =
                plantedTree(0, PlantStage.SEED, GamificationRules.GARDEN_STAGE_THRESHOLD - 1, 0);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(50);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.waterTree(new WaterTreeReq(tree.getId()));

        PlantedTreeRes result = dataOf(response).plantedTrees().get(0);
        assertEquals(PlantStage.SPROUT, result.stage());
        assertEquals(9, result.growthProgress());
    }

    @Test
    void waterTree_ancientTreeStaysAtMaxProgress() {
        PlantedTreeEntity tree =
                plantedTree(0, PlantStage.ANCIENT, GamificationRules.GARDEN_STAGE_THRESHOLD, 0);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(50);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.waterTree(new WaterTreeReq(tree.getId()));

        PlantedTreeRes result = dataOf(response).plantedTrees().get(0);
        assertEquals(PlantStage.ANCIENT, result.stage());
        assertEquals(GamificationRules.GARDEN_STAGE_THRESHOLD, result.growthProgress());
    }

    @Test
    void waterTree_withoutEnoughDewIsRejected() {
        PlantedTreeEntity tree = plantedTree(0, PlantStage.SEED, 0, 0);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(GamificationRules.GARDEN_WATER_DEW_COST - 1);
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class,
                () -> gardenService.waterTree(new WaterTreeReq(tree.getId())));
        verify(gardenStateRepository, never()).saveAndFlush(any());
    }

    @Test
    void waterTree_withNullCountersTreatsThemAsZero() {
        PlantedTreeEntity tree = plantedTree(0, PlantStage.SEED, 0, 0);
        tree.setWaterLevel(null);
        tree.setTotalWaters(null);
        tree.setGrowthProgress(null);
        garden.getPlantedTrees().add(tree);
        garden.setDewDrops(null);
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class,
                () -> gardenService.waterTree(new WaterTreeReq(tree.getId())));
    }

    @Test
    void waterTree_unknownTreeThrowsNotFound() {
        currentUserOwnsGarden();

        assertThrows(
                NotFoundException.class,
                () -> gardenService.waterTree(new WaterTreeReq(UUID.randomUUID())));
    }

    @Test
    void waterTree_cannotWaterATreeOfAnotherGarden() {
        PlantedTreeEntity foreignTree = plantedTree(0, PlantStage.SEED, 0, 0);
        garden.setDewDrops(100);
        currentUserOwnsGarden();

        // the tree is not attached to the current user's garden
        assertThrows(
                NotFoundException.class,
                () -> gardenService.waterTree(new WaterTreeReq(foreignTree.getId())));
    }

    // ------------------------------------------------------------ unlockPlot

    @Test
    void unlockPlot_spendsCoinsAndUnlocks() {
        garden.setForestCoins(100);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.unlockPlot(new UnlockPlotReq(3));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        GardenStateRes state = dataOf(response);
        assertEquals(50, state.forestCoins());
        assertTrue(state.plots().get(3).isUnlocked());
    }

    @Test
    void unlockPlot_alreadyUnlockedIsIdempotent() {
        garden.setForestCoins(100);
        currentUserOwnsGarden();

        ApiRes response = gardenService.unlockPlot(new UnlockPlotReq(0));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(100, dataOf(response).forestCoins());
        verify(gardenStateRepository, never()).saveAndFlush(any());
    }

    @Test
    void unlockPlot_withoutEnoughCoinsIsRejected() {
        garden.setForestCoins(1);
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class, () -> gardenService.unlockPlot(new UnlockPlotReq(3)));
    }

    @Test
    void unlockPlot_withNullCoinsIsRejected() {
        garden.setForestCoins(null);
        currentUserOwnsGarden();

        assertThrows(
                ValidationException.class, () -> gardenService.unlockPlot(new UnlockPlotReq(3)));
    }

    @Test
    void unlockPlot_withNullCostIsFree() {
        garden.setForestCoins(0);
        garden.getPlots().get(3).setUnlockCost(null);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response = gardenService.unlockPlot(new UnlockPlotReq(3));

        assertTrue(dataOf(response).plots().get(3).isUnlocked());
    }

    @Test
    void unlockPlot_unknownPlotThrowsNotFound() {
        currentUserOwnsGarden();

        assertThrows(
                NotFoundException.class, () -> gardenService.unlockPlot(new UnlockPlotReq(42)));
    }

    // -------------------------------------------------- completePomodoro

    @Test
    void completePomodoroSession_grantsAllRewardsAndPersistsSession() {
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(
                                25, 5, SessionMode.FOCUS, Soundscape.CAMPFIRE, UUID.randomUUID()));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        assertEquals(25 * GamificationRules.GARDEN_XP_PER_FOCUS_MINUTE, reward.xpGained());
        assertEquals(
                25 * GamificationRules.GARDEN_GROWTH_PER_FOCUS_MINUTE, reward.growthPointsGained());
        assertEquals(GamificationRules.GARDEN_DEW_PER_SESSION, reward.dewDropsGained());
        assertEquals(GamificationRules.GARDEN_SUNLIGHT_PER_SESSION, reward.sunlightOrbsGained());
        assertEquals(GamificationRules.GARDEN_COINS_PER_SESSION, reward.forestCoinsGained());
        assertNotNull(reward.seedRewarded());
        assertEquals(25, reward.garden().totalFocusMinutes());
        assertEquals(1, reward.garden().completedSessionsCount());
        verify(userService).updateUserProgress(75);
        verify(pomodoroSessionRepository).saveAndFlush(any(PomodoroSessionEntity.class));
    }

    @Test
    void completePomodoroSession_appliesDefaultsForOptionalFields() {
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        gardenService.completePomodoroSession(new CompletePomodoroReq(10, null, null, null, null));

        ArgumentCaptor<PomodoroSessionEntity> captor =
                ArgumentCaptor.forClass(PomodoroSessionEntity.class);
        verify(pomodoroSessionRepository).saveAndFlush(captor.capture());
        PomodoroSessionEntity saved = captor.getValue();
        assertEquals(5, saved.getBreakDurationMinutes());
        assertEquals(SessionMode.FOCUS, saved.getMode());
        assertEquals(Soundscape.NONE, saved.getSoundscape());
        assertEquals(user, saved.getUser());
        assertNull(saved.getSubjectId());
    }

    @Test
    void completePomodoroSession_distributesGrowthAcrossPlantedTrees() {
        garden.getPlantedTrees().add(plantedTree(0, PlantStage.SEED, 0, 0));
        garden.getPlantedTrees().add(plantedTree(1, PlantStage.SEED, 0, 0));
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(25, null, null, null, null));

        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        // 25 minutes * 2 = 50 growth, shared between 2 trees -> 25 each
        assertEquals(25, reward.garden().plantedTrees().get(0).growthProgress());
        assertEquals(25, reward.garden().plantedTrees().get(1).growthProgress());
    }

    @Test
    void completePomodoroSession_shortSessionStillGivesAtLeastOneGrowthPerTree() {
        for (int i = 0; i < 3; i++) {
            garden.getPlantedTrees().add(plantedTree(i, PlantStage.SEED, 0, 0));
        }
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(1, null, null, null, null));

        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        reward.garden().plantedTrees().forEach(t -> assertTrue(t.growthProgress() >= 1));
    }

    @Test
    void completePomodoroSession_recomputesForestLevel() {
        garden.setGrowthPoints(350);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(25, null, null, null, null));

        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        assertEquals(400, reward.garden().growthPoints());
        assertEquals(5, reward.garden().forestLevel());
    }

    @Test
    void completePomodoroSession_rewardsSeedsCyclingThroughSpecies() {
        garden.setCompletedSessionsCount(PlantSpecies.values().length - 1);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(5, null, null, null, null));

        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        // the counter is incremented before the reward, so it wraps back to the first species
        assertEquals(PlantSpecies.values()[0], reward.seedRewarded());
        assertEquals(2, reward.garden().seedInventory().get(PlantSpecies.CAMPHOR_TREE));
    }

    @Test
    void completePomodoroSession_withNullCountersStartsFromZero() {
        garden.setGrowthPoints(null);
        garden.setDewDrops(null);
        garden.setSunlightOrbs(null);
        garden.setForestCoins(null);
        garden.setTotalFocusMinutes(null);
        garden.setCompletedSessionsCount(null);
        garden.setTotalXpContributed(null);
        currentUserOwnsGarden();
        when(gardenStateRepository.saveAndFlush(garden)).thenReturn(garden);

        ApiRes response =
                gardenService.completePomodoroSession(
                        new CompletePomodoroReq(10, null, null, null, null));

        PomodoroRewardRes reward = (PomodoroRewardRes) response.getBody().data();
        assertEquals(20, reward.garden().growthPoints());
        assertEquals(GamificationRules.GARDEN_DEW_PER_SESSION, reward.garden().dewDrops());
        assertEquals(30, reward.garden().totalXpContributed());
    }

    // -------------------------------------------------------------- fallbacks

    @Test
    void fallbacks_rethrowDomainExceptions() {
        ValidationException validation = new ValidationException("nope");
        NotFoundException notFound = new NotFoundException("missing");

        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "getGardenFallback", new Class<?>[] {Throwable.class}, validation));
        assertThrows(
                NotFoundException.class,
                () ->
                        invokePrivate(
                                "getGardenFallback", new Class<?>[] {Throwable.class}, notFound));
        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "plantSeedFallback",
                                new Class<?>[] {PlantSeedReq.class, Throwable.class},
                                null,
                                validation));
        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "waterTreeFallback",
                                new Class<?>[] {WaterTreeReq.class, Throwable.class},
                                null,
                                validation));
        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "unlockPlotFallback",
                                new Class<?>[] {UnlockPlotReq.class, Throwable.class},
                                null,
                                validation));
        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "completeSessionFallback",
                                new Class<?>[] {CompletePomodoroReq.class, Throwable.class},
                                null,
                                validation));
    }

    @Test
    void fallbacks_returnServiceUnavailableForInfrastructureFailures() throws Exception {
        Throwable cause = new IllegalStateException("db down");

        List<ApiRes> responses =
                List.of(
                        (ApiRes)
                                invokePrivate(
                                        "getGardenFallback",
                                        new Class<?>[] {Throwable.class},
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "plantSeedFallback",
                                        new Class<?>[] {PlantSeedReq.class, Throwable.class},
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "waterTreeFallback",
                                        new Class<?>[] {WaterTreeReq.class, Throwable.class},
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "unlockPlotFallback",
                                        new Class<?>[] {UnlockPlotReq.class, Throwable.class},
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "completeSessionFallback",
                                        new Class<?>[] {CompletePomodoroReq.class, Throwable.class},
                                        null,
                                        cause));

        responses.forEach(
                response -> {
                    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
                    assertFalse(response.getBody().isSuccess());
                });
    }

    // --------------------------------------------------------------- helpers

    private PlantedTreeEntity plantedTree(
            int plotIndex, PlantStage stage, int growthProgress, int waterLevel) {
        PlantedTreeEntity tree =
                PlantedTreeEntity.builder()
                        .garden(garden)
                        .plotIndex(plotIndex)
                        .species(PlantSpecies.CAMPHOR_TREE)
                        .stage(stage)
                        .growthProgress(growthProgress)
                        .waterLevel(waterLevel)
                        .totalWaters(0)
                        .plantedAt(Instant.now())
                        .build();
        tree.setId(UUID.randomUUID());
        return tree;
    }
}
