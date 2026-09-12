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

package com.app.oopsly.api.unit.stats.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.Card;
import com.app.oopsly.api.card.CardRepository;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.stats.application.StatsServiceImpl;
import com.app.oopsly.api.stats.application.vm.StatsRes;
import com.app.oopsly.api.stats.domain.ReviewLogEntity;
import com.app.oopsly.api.stats.infrastructure.ReviewLogRepository;
import com.app.oopsly.api.user.UserService;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.User;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Edge cases of the learner statistics aggregation. */
@ExtendWith(MockitoExtension.class)
class StatsServiceEdgeCaseTest {

    @Mock private UserService userService;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private CardRepository cardRepository;
    @Mock private ReviewLogRepository reviewLogRepository;

    @InjectMocks private StatsServiceImpl statsService;

    private User user;
    private Shelf shelf;
    private Subject subject;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setDailyStreak(7);
        user.setTotalXp(999);

        shelf = new Shelf();
        shelf.setId(UUID.randomUUID());
        shelf.setUser(user);

        subject = new Subject();
        subject.setId(UUID.randomUUID());
        subject.setShelf(shelf);
    }

    private Card card(Integer repetitions, Double difficulty, Instant nextPractice) {
        Card card = new Card();
        card.setId(UUID.randomUUID());
        card.setSubject(subject);
        card.setFsrsRepetitions(repetitions);
        card.setFsrsDifficulty(difficulty);
        card.setNextPracticeTime(nextPractice);
        return card;
    }

    private ReviewLogEntity reviewLog(Integer grade) {
        ReviewLogEntity log = new ReviewLogEntity();
        log.setId(UUID.randomUUID());
        log.setUserId(user.getId());
        log.setGrade(grade);
        log.setReviewedAt(Instant.now());
        return log;
    }

    private void libraryOf(List<Card> cards) {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelf)));
        when(subjectRepository.findAllByShelve(eq(shelf), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(subject)));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject))).thenReturn(cards);
    }

    private static StatsRes statsOf(ApiRes response) {
        return (StatsRes) response.getBody().data();
    }

    @Test
    void getUserStats_withoutAnyShelfSkipsTheCardLookup() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(0L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        StatsRes stats = statsOf(statsService.getUserStats());

        assertEquals(0L, stats.totalCards());
        assertEquals(0L, stats.dueCards());
        assertEquals(0.0, stats.retentionRate());
        assertEquals(20, stats.dailyGoal());
        verifyNoInteractions(cardRepository);
    }

    @Test
    void getUserStats_usesTheConfiguredDailyGoalAndStoredRetention() {
        Setting setting = new Setting();
        setting.setDailyGoal(42);
        user.setSetting(setting);
        user.setRetentionRate(88.5);
        libraryOf(List.of(card(0, 0.0, Instant.now().minusSeconds(10))));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(3L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        StatsRes stats = statsOf(statsService.getUserStats());

        assertEquals(42, stats.dailyGoal());
        assertEquals(88.5, stats.retentionRate());
    }

    @Test
    void getUserStats_ignoresTheStoredRetentionWhenItIsNotPositive() {
        user.setRetentionRate(0.0);
        libraryOf(List.of(card(0, 0.0, Instant.now().minusSeconds(10))));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(0L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        // one card, all due -> computed retention drops to zero
        assertEquals(0.0, statsOf(statsService.getUserStats()).retentionRate());
    }

    @Test
    void getUserStats_classifiesEveryFsrsState() {
        List<Card> cards =
                List.of(
                        card(null, null, null), // new, never scheduled
                        card(1, 1.0, Instant.now().plusSeconds(3600)), // learning
                        card(5, 5.0, Instant.now().plusSeconds(3600)), // review
                        card(6, 9.0, Instant.now().plusSeconds(3600)), // relearning
                        card(9, 2.0, Instant.now().plusSeconds(3600))); // mastered
        libraryOf(cards);
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(0L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        StatsRes stats = statsOf(statsService.getUserStats());

        assertEquals(5L, stats.totalCards());
        assertEquals(0L, stats.dueCards());
        assertEquals(1L, stats.stateDistribution().newCards());
        assertEquals(1L, stats.stateDistribution().learning());
        assertEquals(2L, stats.stateDistribution().review());
        assertEquals(1L, stats.stateDistribution().relearning());
        assertEquals(1L, stats.stateDistribution().mastered());
    }

    @Test
    void getUserStats_forecastsCardsDueToday() {
        libraryOf(List.of(card(1, 1.0, Instant.now()), card(1, 1.0, null)));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(0L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        StatsRes stats = statsOf(statsService.getUserStats());

        assertEquals(7, stats.upcomingDueForecast().size());
        assertTrue(stats.upcomingDueForecast().stream().anyMatch(f -> f.dueCount() >= 1));
    }

    @Test
    void getUserStats_computesWeeklyRetentionFromReviewGrades() {
        libraryOf(List.of());
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(4L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(
                        List.of(
                                reviewLog(4), // successful
                                reviewLog(3), // successful
                                reviewLog(1), // lapse
                                reviewLog(null))); // unknown grade counts as a lapse

        StatsRes stats = statsOf(statsService.getUserStats());

        assertEquals(7, stats.weeklyActivity().size());
        stats.weeklyActivity()
                .forEach(
                        day -> {
                            assertEquals(4L, day.cardsReviewed());
                            assertEquals(50.0, day.retention());
                        });
    }
}
