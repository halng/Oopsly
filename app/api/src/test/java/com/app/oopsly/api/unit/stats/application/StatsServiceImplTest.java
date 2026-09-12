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
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.stats.application.StatsServiceImpl;
import com.app.oopsly.api.stats.application.vm.StatsRes;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectRepository;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
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

@ExtendWith(MockitoExtension.class)
class StatsServiceImplTest {

    @Mock private UserService userService;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private CardRepository cardRepository;

    @Mock private com.app.oopsly.api.stats.infrastructure.ReviewLogRepository reviewLogRepository;

    @InjectMocks private StatsServiceImpl statsService;

    private User user;
    private Shelf shelf;
    private Subject subject;

    @BeforeEach
    void setUp() {
        Setting setting = new Setting();
        setting.setTotalXp(120);
        setting.setDailyStreak(3);
        user = new User();
        user.setSetting(setting);
        user.setId(UUID.randomUUID());
        shelf = new Shelf();
        shelf.setId(UUID.randomUUID());
        shelf.setUser(user);

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

        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelf)));
        when(subjectRepository.findAllByShelve(eq(shelf), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(subject)));
        when(cardRepository.findAllBySubjectInAndDeletedFalse(List.of(subject)))
                .thenReturn(List.of(dueCard, futureCard));
        when(reviewLogRepository.countByUserIdAndReviewedAtBetween(eq(user.getId()), any(), any()))
                .thenReturn(4L);
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
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
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(reviewLogRepository.findAllByUserIdAndReviewedAtBetween(
                        eq(user.getId()), any(), any()))
                .thenReturn(List.of());

        ApiRes result = statsService.getUserStats();

        StatsRes stats = (StatsRes) result.getBody().data();
        assertEquals(3, stats.streakDays());
        assertEquals(120, stats.totalXp());
        assertEquals(0L, stats.totalCards());
        assertEquals(0.0, stats.retentionRate());
    }
}
