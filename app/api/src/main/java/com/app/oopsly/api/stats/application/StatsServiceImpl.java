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

package com.app.oopsly.api.stats.application;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.stats.application.vm.DueForecast;
import com.app.oopsly.api.stats.application.vm.StateDistribution;
import com.app.oopsly.api.stats.application.vm.StatsRes;
import com.app.oopsly.api.stats.application.vm.WeeklyActivity;
import com.app.oopsly.api.stats.infrastructure.ReviewLogRepository;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {

    private static final int FORECAST_DAYS = 7;
    private static final int WEEK_DAYS = 7;
    private static final int LEARNING_REPETITION_LIMIT = 3;
    private static final double MASTERED_DIFFICULTY_LIMIT = 4.0;
    private static final double RELEARNING_DIFFICULTY_LIMIT = 7.0;

    private final UserService userService;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;
    private final ReviewLogRepository reviewLogRepository;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.STATS, fallbackMethod = "statsFallback")
    public ApiRes getUserStats() {
        User currentUser = userService.getCurrentUser();
        log.info("Fetching stats for user: {}", currentUser.getId());

        List<Subject> subjects = findSubjects(currentUser);
        List<Card> cards =
                subjects.isEmpty()
                        ? List.of()
                        : cardRepository.findAllBySubjectInAndDeletedFalse(subjects);

        Instant now = Instant.now();
        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endOfDay = startOfDay.plus(1, ChronoUnit.DAYS);

        long totalCards = cards.size();
        long dueCards =
                cards.stream()
                        .filter(c -> c.getNextPracticeTime() != null)
                        .filter(c -> !c.getNextPracticeTime().isAfter(now))
                        .count();

        long reviewedToday =
                reviewLogRepository.countByUserIdAndReviewedAtBetween(
                        currentUser.getId(), startOfDay, endOfDay);

        double retention = retentionOf(currentUser, totalCards, dueCards);

        StatsRes stats =
                new StatsRes(
                        safeInt(currentUser.getSetting().getDailyStreak()),
                        safeInt(currentUser.getSetting().getTotalXp()),
                        (int) reviewedToday,
                        (int) reviewedToday,
                        dailyGoalOf(currentUser),
                        retention,
                        retention,
                        safeInt(currentUser.getSetting().getTotalReviews()),
                        totalCards,
                        dueCards,
                        stateDistribution(cards),
                        dueForecast(cards),
                        weeklyActivity(currentUser));

        return ApiRes.success(ApiMessages.STATS_FETCHED, stats);
    }

    // ---------------------------------------------------------------- helpers

    private List<Subject> findSubjects(User currentUser) {
        List<Shelf> shelves =
                shelfRepository
                        .findAllByUser(currentUser, PageRequest.of(0, Integer.MAX_VALUE))
                        .getContent();

        return shelves.stream()
                .flatMap(
                        shelf ->
                                subjectRepository
                                        .findAllByShelve(
                                                shelf, PageRequest.of(0, Integer.MAX_VALUE))
                                        .getContent()
                                        .stream())
                .collect(Collectors.toList());
    }

    private StateDistribution stateDistribution(List<Card> cards) {
        long newCards = cards.stream().filter(c -> safeInt(c.getFsrsRepetitions()) == 0).count();
        long learning =
                cards.stream()
                        .filter(
                                c ->
                                        safeInt(c.getFsrsRepetitions()) > 0
                                                && safeInt(c.getFsrsRepetitions())
                                                        < LEARNING_REPETITION_LIMIT)
                        .count();
        long review =
                cards.stream()
                        .filter(
                                c ->
                                        safeInt(c.getFsrsRepetitions()) >= LEARNING_REPETITION_LIMIT
                                                && safeDouble(c.getFsrsDifficulty())
                                                        > MASTERED_DIFFICULTY_LIMIT)
                        .count();
        long relearning =
                cards.stream()
                        .filter(
                                c ->
                                        safeInt(c.getFsrsRepetitions()) > 0
                                                && safeDouble(c.getFsrsDifficulty())
                                                        > RELEARNING_DIFFICULTY_LIMIT)
                        .count();
        long mastered =
                cards.stream()
                        .filter(
                                c ->
                                        safeInt(c.getFsrsRepetitions()) >= LEARNING_REPETITION_LIMIT
                                                && safeDouble(c.getFsrsDifficulty())
                                                        <= MASTERED_DIFFICULTY_LIMIT)
                        .count();

        return new StateDistribution(newCards, learning, review, relearning, mastered);
    }

    private List<DueForecast> dueForecast(List<Card> cards) {
        List<DueForecast> forecast = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        for (int i = 0; i < FORECAST_DAYS; i++) {
            LocalDate day = today.plusDays(i);
            long dueCount =
                    cards.stream()
                            .filter(c -> c.getNextPracticeTime() != null)
                            .filter(
                                    c ->
                                            LocalDate.ofInstant(
                                                            c.getNextPracticeTime(), ZoneOffset.UTC)
                                                    .equals(day))
                            .count();
            forecast.add(
                    new DueForecast(
                            day.toString(),
                            day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                            dueCount));
        }
        return forecast;
    }

    private List<WeeklyActivity> weeklyActivity(User currentUser) {
        List<WeeklyActivity> activity = new ArrayList<>();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        for (int i = WEEK_DAYS - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            Instant from = day.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant to = from.plus(1, ChronoUnit.DAYS);

            var logs =
                    reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                            currentUser.getId(), from, to);
            long reviewed = logs.size();
            double retention =
                    reviewed == 0
                            ? 0.0
                            : (logs.stream()
                                                    .filter(
                                                            l ->
                                                                    l.getGrade() != null
                                                                            && l.getGrade() > 1)
                                                    .count()
                                            * 100.0)
                                    / reviewed;

            activity.add(
                    new WeeklyActivity(
                            day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                            reviewed,
                            retention));
        }
        return activity;
    }

    private static int dailyGoalOf(User user) {
        return user.getSetting() != null && user.getSetting().getDailyGoal() != null
                ? user.getSetting().getDailyGoal()
                : 20;
    }

    private static double retentionOf(User user, long totalCards, long dueCards) {
        if (user.getSetting() != null
                && user.getSetting().getRetentionRate() != null
                && user.getSetting().getRetentionRate() > 0) {
            return user.getSetting().getRetentionRate();
        }
        return totalCards == 0 ? 0.0 : 100.0 - (dueCards * 100.0) / totalCards;
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private static double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    @SuppressWarnings("unused")
    private ApiRes statsFallback(Throwable throwable) {
        if (throwable instanceof NotFoundException || throwable instanceof ValidationException) {
            throw (RuntimeException) throwable;
        }
        log.error("Stats service degraded: {}", throwable.getMessage(), throwable);
        return ApiRes.retryLater(ApiMessages.STATS_UNAVAILABLE);
    }
}
