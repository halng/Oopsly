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
import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.client.AuthProfile;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.stats.application.StatsServiceImpl;
import com.app.oopsly.api.stats.application.vm.StatsRes;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StatsServiceImplTest {

    @Mock private CurrentUser currentUser;
    @Mock private UserProgressService userProgressService;
    @Mock private AuthClient authClient;
    @Mock private SubjectRepository subjectRepository;
    @Mock private CardRepository cardRepository;

    @Mock private com.app.oopsly.api.stats.infrastructure.ReviewLogRepository reviewLogRepository;

    @InjectMocks private StatsServiceImpl statsService;

    private UUID userId;
    private UserProgress progress;
    private Shelf shelf;
    private Subject subject;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        progress = UserProgress.builder().userId(userId).totalXp(120).dailyStreak(3).build();
        lenient().when(userProgressService.getCurrent()).thenReturn(progress);
        lenient().when(authClient.lookup(userId)).thenReturn(AuthProfile.unknown(userId));
        shelf = new Shelf();
        shelf.setId(UUID.randomUUID());
        shelf.setUserId(userId);

        subject = new Subject();
        subject.setId(UUID.randomUUID());
        subject.setShelf(shelf);
    }

    @Test
    void getUserStats_withCards_computesRetention() {
        Card dueCard = new Card();
        dueCard.setId(UUID.randomUUID());
        dueCard.setSubject(subject);
        dueCard.setNextPracticeTime(java.time.Instant.now().minusSeconds(60));
        dueCard.setFsrsRepetitions(0);
        dueCard.setFsrsDifficulty(0.0);

        Card futureCard = new Card();
        futureCard.setId(UUID.randomUUID());
        futureCard.setSubject(subject);
        futureCard.setNextPracticeTime(java.time.Instant.now().plusSeconds(86_400));
        futureCard.setFsrsRepetitions(5);
        futureCard.setFsrsDifficulty(2.0);

        when(currentUser.id()).thenReturn(userId);
        when(subjectRepository.findAllByUserId(userId)).thenReturn(List.of(subject));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of(dueCard, futureCard));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(userId), any(), any()))
                .thenReturn(4L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of());

        ApiRes result = statsService.getUserStats();

        assertTrue(result.getBody().isSuccess());
        StatsRes stats = (StatsRes) result.getBody().data();
        assertEquals(3, stats.streakDays());
        assertEquals(120, stats.totalXp());
        assertEquals(4, stats.reviewedToday());
        assertEquals(2L, stats.totalCards());
        assertEquals(1L, stats.dueCards());
        assertEquals(50.0, stats.retentionRate());
        assertEquals(1L, stats.stateDistribution().newCards());
        assertEquals(7, stats.upcomingDueForecast().size());
        assertEquals(7, stats.weeklyActivity().size());
    }

    @Test
    void getUserStats_withNoCards_returnsZeroRetentionAndNullSafeXp() {
        when(currentUser.id()).thenReturn(userId);
        when(subjectRepository.findAllByUserId(userId)).thenReturn(List.of());
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of());

        ApiRes result = statsService.getUserStats();

        StatsRes stats = (StatsRes) result.getBody().data();
        assertEquals(3, stats.streakDays());
        assertEquals(120, stats.totalXp());
        assertEquals(0L, stats.totalCards());
        assertEquals(0.0, stats.retentionRate());
    }

    @Test
    void getUserStats_withNullSetting_returnsZeroXpAndStreak() {
        progress.setTotalXp(0);
        progress.setDailyStreak(0);
        when(currentUser.id()).thenReturn(userId);
        when(subjectRepository.findAllByUserId(userId)).thenReturn(List.of());
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of());

        StatsRes stats = (StatsRes) statsService.getUserStats().getBody().data();

        assertEquals(0, stats.streakDays());
        assertEquals(0, stats.totalXp());
        assertEquals(20, stats.dailyGoal());
        assertEquals(0.0, stats.retentionRate());
    }
}
