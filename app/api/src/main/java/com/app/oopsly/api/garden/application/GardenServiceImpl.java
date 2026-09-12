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

package com.app.oopsly.api.garden.application;

import com.app.oopsly.api.garden.application.vm.CompletePomodoroReq;
import com.app.oopsly.api.garden.application.vm.GardenStateRes;
import com.app.oopsly.api.garden.application.vm.LandPlotRes;
import com.app.oopsly.api.garden.application.vm.PlantSeedReq;
import com.app.oopsly.api.garden.application.vm.PlantedTreeRes;
import com.app.oopsly.api.garden.application.vm.PomodoroRewardRes;
import com.app.oopsly.api.garden.application.vm.UnlockPlotReq;
import com.app.oopsly.api.garden.application.vm.WaterTreeReq;
import com.app.oopsly.api.garden.domain.*;
import com.app.oopsly.api.garden.domain.SessionMode;
import com.app.oopsly.api.garden.domain.Soundscape;
import com.app.oopsly.api.garden.infrastructure.GardenStateRepository;
import com.app.oopsly.api.garden.infrastructure.PomodoroSessionRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GardenServiceImpl implements GardenService {

    private final GardenStateRepository gardenStateRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final UserService userService;

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.GARDEN, fallbackMethod = "getGardenFallback")
    public ApiRes getGarden() {
        GardenStateEntity garden = getOrCreateGarden();
        return ApiRes.success(ApiMessages.GARDEN_FETCHED, toGardenRes(garden));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.GARDEN, fallbackMethod = "plantSeedFallback")
    public ApiRes plantSeed(PlantSeedReq request) {
        GardenStateEntity garden = getOrCreateGarden();

        LandPlotEntity plot = findPlot(garden, request.plotIndex());
        if (!Boolean.TRUE.equals(plot.getIsUnlocked())) {
            throw new ValidationException(ApiMessages.GARDEN_PLOT_LOCKED);
        }
        if (findTreeOnPlot(garden, request.plotIndex()).isPresent()) {
            throw new ValidationException(ApiMessages.GARDEN_PLOT_OCCUPIED);
        }

        Map<PlantSpecies, Integer> inventory = seedInventoryOf(garden);
        int available = inventory.getOrDefault(request.species(), 0);
        if (available <= 0) {
            throw new ValidationException(ApiMessages.GARDEN_NO_SEED);
        }
        inventory.put(request.species(), available - 1);
        garden.setSeedInventory(inventory);

        PlantedTreeEntity tree =
                PlantedTreeEntity.builder()
                        .garden(garden)
                        .plotIndex(request.plotIndex())
                        .species(request.species())
                        .stage(PlantStage.SEED)
                        .nickname(request.nickname())
                        .plantedAt(Instant.now())
                        .build();
        garden.getPlantedTrees().add(tree);
        gardenStateRepository.saveAndFlush(garden);

        log.info("Planted {} on plot {}", request.species(), request.plotIndex());
        return ApiRes.created(ApiMessages.GARDEN_SEED_PLANTED, toGardenRes(garden));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.GARDEN, fallbackMethod = "waterTreeFallback")
    public ApiRes waterTree(WaterTreeReq request) {
        GardenStateEntity garden = getOrCreateGarden();

        PlantedTreeEntity tree =
                garden.getPlantedTrees().stream()
                        .filter(t -> request.treeId().equals(t.getId()))
                        .findFirst()
                        .orElseThrow(
                                () -> new NotFoundException(ApiMessages.GARDEN_TREE_NOT_FOUND));

        if (safeInt(garden.getDewDrops()) < GamificationRules.GARDEN_WATER_DEW_COST) {
            throw new ValidationException(ApiMessages.GARDEN_NOT_ENOUGH_DEW);
        }

        garden.setDewDrops(safeInt(garden.getDewDrops()) - GamificationRules.GARDEN_WATER_DEW_COST);
        tree.setWaterLevel(
                Math.min(
                        100,
                        safeInt(tree.getWaterLevel()) + GamificationRules.GARDEN_WATER_LEVEL_GAIN));
        tree.setTotalWaters(safeInt(tree.getTotalWaters()) + 1);
        tree.setLastWateredAt(Instant.now());
        applyGrowth(tree, GamificationRules.GARDEN_WATER_GROWTH_GAIN);

        gardenStateRepository.saveAndFlush(garden);
        return ApiRes.success(ApiMessages.GARDEN_TREE_WATERED, toGardenRes(garden));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.GARDEN, fallbackMethod = "unlockPlotFallback")
    public ApiRes unlockPlot(UnlockPlotReq request) {
        GardenStateEntity garden = getOrCreateGarden();
        LandPlotEntity plot = findPlot(garden, request.plotIndex());

        if (Boolean.TRUE.equals(plot.getIsUnlocked())) {
            return ApiRes.success(ApiMessages.GARDEN_PLOT_UNLOCKED, toGardenRes(garden));
        }
        int cost = safeInt(plot.getUnlockCost());
        if (safeInt(garden.getForestCoins()) < cost) {
            throw new ValidationException(ApiMessages.GARDEN_NOT_ENOUGH_COINS);
        }

        garden.setForestCoins(safeInt(garden.getForestCoins()) - cost);
        plot.setIsUnlocked(true);
        gardenStateRepository.saveAndFlush(garden);

        log.info("Unlocked garden plot {}", request.plotIndex());
        return ApiRes.success(ApiMessages.GARDEN_PLOT_UNLOCKED, toGardenRes(garden));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.GARDEN, fallbackMethod = "completeSessionFallback")
    public ApiRes completePomodoroSession(CompletePomodoroReq request) {
        User currentUser = userService.getCurrentUser();
        GardenStateEntity garden = getOrCreateGarden();

        int minutes = request.focusDurationMinutes();
        int growthGained = minutes * GamificationRules.GARDEN_GROWTH_PER_FOCUS_MINUTE;
        int xpGained = minutes * GamificationRules.GARDEN_XP_PER_FOCUS_MINUTE;

        garden.setGrowthPoints(safeInt(garden.getGrowthPoints()) + growthGained);
        garden.setDewDrops(
                safeInt(garden.getDewDrops()) + GamificationRules.GARDEN_DEW_PER_SESSION);
        garden.setSunlightOrbs(
                safeInt(garden.getSunlightOrbs()) + GamificationRules.GARDEN_SUNLIGHT_PER_SESSION);
        garden.setForestCoins(
                safeInt(garden.getForestCoins()) + GamificationRules.GARDEN_COINS_PER_SESSION);
        garden.setTotalFocusMinutes(safeInt(garden.getTotalFocusMinutes()) + minutes);
        garden.setCompletedSessionsCount(safeInt(garden.getCompletedSessionsCount()) + 1);
        garden.setTotalXpContributed(safeInt(garden.getTotalXpContributed()) + xpGained);

        PlantSpecies seedRewarded = rewardSeed(garden);
        distributeGrowthToTrees(garden, growthGained);
        recomputeForestLevel(garden);

        pomodoroSessionRepository.saveAndFlush(
                PomodoroSessionEntity.builder()
                        .user(currentUser)
                        .subjectId(request.subjectId())
                        .focusDurationMinutes(minutes)
                        .breakDurationMinutes(
                                request.breakDurationMinutes() == null
                                        ? 5
                                        : request.breakDurationMinutes())
                        .mode(request.mode() == null ? SessionMode.FOCUS : request.mode())
                        .soundscape(
                                request.soundscape() == null
                                        ? Soundscape.NONE
                                        : request.soundscape())
                        .xpGained(xpGained)
                        .growthPointsGained(growthGained)
                        .build());

        gardenStateRepository.saveAndFlush(garden);
        userService.updateUserProgress(xpGained);

        log.info("Pomodoro session of {} minutes completed, {} XP granted", minutes, xpGained);
        return ApiRes.success(
                ApiMessages.POMODORO_SESSION_COMPLETED,
                new PomodoroRewardRes(
                        xpGained,
                        growthGained,
                        GamificationRules.GARDEN_DEW_PER_SESSION,
                        GamificationRules.GARDEN_SUNLIGHT_PER_SESSION,
                        GamificationRules.GARDEN_COINS_PER_SESSION,
                        seedRewarded,
                        toGardenRes(garden)));
    }

    // ---------------------------------------------------------------- domain

    private GardenStateEntity getOrCreateGarden() {
        User currentUser = userService.getCurrentUser();
        return gardenStateRepository
                .findByUserId(currentUser.getId())
                .orElseGet(() -> gardenStateRepository.saveAndFlush(newGarden(currentUser)));
    }

    private GardenStateEntity newGarden(User user) {
        GardenStateEntity garden =
                GardenStateEntity.builder()
                        .user(user)
                        .seedInventory(defaultInventory())
                        .dewDrops(GamificationRules.GARDEN_DEW_PER_SESSION)
                        .build();

        List<LandPlotEntity> plots = new ArrayList<>();
        for (int i = 0; i < GamificationRules.GARDEN_DEFAULT_PLOTS; i++) {
            plots.add(
                    LandPlotEntity.builder()
                            .garden(garden)
                            .plotIndex(i)
                            .isUnlocked(i < GamificationRules.GARDEN_FREE_PLOTS)
                            .unlockCost(
                                    i < GamificationRules.GARDEN_FREE_PLOTS
                                            ? 0
                                            : GamificationRules.GARDEN_PLOT_UNLOCK_COST
                                                    * (i - GamificationRules.GARDEN_FREE_PLOTS + 1))
                            .build());
        }
        garden.setPlots(plots);
        return garden;
    }

    private static Map<PlantSpecies, Integer> defaultInventory() {
        Map<PlantSpecies, Integer> inventory = new EnumMap<>(PlantSpecies.class);
        for (PlantSpecies species : PlantSpecies.values()) {
            inventory.put(species, 0);
        }
        inventory.put(PlantSpecies.CAMPHOR_TREE, 1);
        return inventory;
    }

    private Map<PlantSpecies, Integer> seedInventoryOf(GardenStateEntity garden) {
        Map<PlantSpecies, Integer> inventory = garden.getSeedInventory();
        if (inventory == null || inventory.isEmpty()) {
            inventory = defaultInventory();
        }
        return new EnumMap<>(inventory);
    }

    private PlantSpecies rewardSeed(GardenStateEntity garden) {
        PlantSpecies[] species = PlantSpecies.values();
        PlantSpecies rewarded =
                species[safeInt(garden.getCompletedSessionsCount()) % species.length];
        Map<PlantSpecies, Integer> inventory = seedInventoryOf(garden);
        inventory.merge(rewarded, 1, Integer::sum);
        garden.setSeedInventory(inventory);
        return rewarded;
    }

    private void distributeGrowthToTrees(GardenStateEntity garden, int growthGained) {
        List<PlantedTreeEntity> trees = garden.getPlantedTrees();
        if (trees == null || trees.isEmpty()) {
            return;
        }
        int share = Math.max(1, growthGained / trees.size());
        trees.forEach(tree -> applyGrowth(tree, share));
    }

    private void applyGrowth(PlantedTreeEntity tree, int growth) {
        int progress = safeInt(tree.getGrowthProgress()) + growth;
        while (progress >= GamificationRules.GARDEN_STAGE_THRESHOLD
                && tree.getStage() != PlantStage.ANCIENT) {
            progress -= GamificationRules.GARDEN_STAGE_THRESHOLD;
            tree.setStage(tree.getStage().next());
        }
        tree.setGrowthProgress(
                tree.getStage() == PlantStage.ANCIENT
                        ? GamificationRules.GARDEN_STAGE_THRESHOLD
                        : progress);
    }

    private void recomputeForestLevel(GardenStateEntity garden) {
        int level =
                1 + safeInt(garden.getGrowthPoints()) / GamificationRules.GARDEN_STAGE_THRESHOLD;
        garden.setForestLevel(level);
    }

    private LandPlotEntity findPlot(GardenStateEntity garden, int plotIndex) {
        return garden.getPlots().stream()
                .filter(p -> p.getPlotIndex() == plotIndex)
                .findFirst()
                .orElseThrow(() -> new NotFoundException(ApiMessages.GARDEN_PLOT_NOT_FOUND));
    }

    private Optional<PlantedTreeEntity> findTreeOnPlot(GardenStateEntity garden, int plotIndex) {
        return garden.getPlantedTrees().stream()
                .filter(t -> t.getPlotIndex() == plotIndex)
                .findFirst();
    }

    private GardenStateRes toGardenRes(GardenStateEntity garden) {
        List<PlantedTreeRes> trees =
                garden.getPlantedTrees().stream()
                        .sorted(Comparator.comparingInt(PlantedTreeEntity::getPlotIndex))
                        .map(
                                t ->
                                        new PlantedTreeRes(
                                                t.getId(),
                                                t.getPlotIndex(),
                                                t.getSpecies(),
                                                t.getStage(),
                                                safeInt(t.getWaterLevel()),
                                                safeInt(t.getGrowthProgress()),
                                                t.getPlantedAt(),
                                                t.getLastWateredAt(),
                                                safeInt(t.getTotalWaters()),
                                                t.getNickname()))
                        .toList();

        List<LandPlotRes> plots =
                garden.getPlots().stream()
                        .sorted(Comparator.comparingInt(LandPlotEntity::getPlotIndex))
                        .map(
                                p ->
                                        new LandPlotRes(
                                                p.getPlotIndex(),
                                                Boolean.TRUE.equals(p.getIsUnlocked()),
                                                safeInt(p.getUnlockCost()),
                                                findTreeOnPlot(garden, p.getPlotIndex())
                                                        .map(PlantedTreeEntity::getId)
                                                        .orElse(null)))
                        .toList();

        return new GardenStateRes(
                plots,
                trees,
                safeInt(garden.getDewDrops()),
                safeInt(garden.getSunlightOrbs()),
                safeInt(garden.getGrowthPoints()),
                safeInt(garden.getForestCoins()),
                seedInventoryOf(garden),
                safeInt(garden.getForestLevel()),
                safeInt(garden.getTotalFocusMinutes()),
                safeInt(garden.getCompletedSessionsCount()),
                safeInt(garden.getTotalXpContributed()),
                garden.getActiveWeather());
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    // -------------------------------------------------------------- fallbacks

    @SuppressWarnings("unused")
    private ApiRes getGardenFallback(Throwable throwable) {
        return gardenFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes plantSeedFallback(PlantSeedReq request, Throwable throwable) {
        return gardenFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes waterTreeFallback(WaterTreeReq request, Throwable throwable) {
        return gardenFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes unlockPlotFallback(UnlockPlotReq request, Throwable throwable) {
        return gardenFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes completeSessionFallback(CompletePomodoroReq request, Throwable throwable) {
        return gardenFallback(throwable);
    }

    private ApiRes gardenFallback(Throwable throwable) {
        if (throwable instanceof NotFoundException || throwable instanceof ValidationException) {
            throw (RuntimeException) throwable;
        }
        log.error("Garden service degraded: {}", throwable.getMessage(), throwable);
        return ApiRes.retryLater(ApiMessages.GARDEN_UNAVAILABLE);
    }
}
