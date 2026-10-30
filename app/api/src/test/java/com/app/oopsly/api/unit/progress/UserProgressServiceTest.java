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

package com.app.oopsly.api.unit.progress;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressRepository;
import com.app.oopsly.api.progress.UserProgressService;
import com.app.oopsly.api.shared.security.CurrentUser;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserProgressServiceTest {

    @Mock private UserProgressRepository repository;
    @Mock private CurrentUser currentUser;

    @InjectMocks private UserProgressService service;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);
    }

    private UserProgress existing(Integer xp, Integer streak, Instant lastReviewedAt) {
        UserProgress progress =
                UserProgress.builder()
                        .userId(userId)
                        .totalXp(xp)
                        .dailyStreak(streak)
                        .lastReviewedAt(lastReviewedAt)
                        .build();
        when(repository.findByUserId(userId)).thenReturn(Optional.of(progress));
        when(repository.findByUserIdWithLock(userId)).thenReturn(Optional.of(progress));
        return progress;
    }

    @Test
    void getCurrent_createsProgressOnFirstAccess() {
        UserProgress created = UserProgress.builder().userId(userId).build();
        when(repository.findByUserId(userId))
                .thenReturn(Optional.empty(), Optional.of(created));

        UserProgress progress = service.getCurrent();

        verify(repository).insertIfAbsent(any(UUID.class), eq(userId));
        assertEquals(userId, progress.getUserId());
        assertEquals(0, progress.getTotalXp());
        assertEquals("BRONZE", progress.getLeague());
    }

    @Test
    void updateUserProgress_firstReviewStartsStreakAtOne() {
        UserProgress progress = existing(10, 0, null);

        service.updateUserProgress(5);

        assertEquals(15, progress.getTotalXp());
        assertEquals(1, progress.getDailyStreak());
        assertNotNull(progress.getLastReviewedAt());
        verify(repository).save(progress);
    }

    @Test
    void updateUserProgress_reviewYesterdayExtendsStreak() {
        UserProgress progress = existing(100, 4, Instant.now().minus(1, ChronoUnit.DAYS));

        service.updateUserProgress(20);

        assertEquals(120, progress.getTotalXp());
        assertEquals(5, progress.getDailyStreak());
    }

    @Test
    void updateUserProgress_reviewTodayKeepsStreak() {
        UserProgress progress = existing(100, 4, Instant.now());

        service.updateUserProgress(20);

        assertEquals(4, progress.getDailyStreak());
    }

    @Test
    void updateUserProgress_gapResetsStreak() {
        UserProgress progress = existing(100, 9, Instant.now().minus(5, ChronoUnit.DAYS));

        service.updateUserProgress(20);

        assertEquals(1, progress.getDailyStreak());
    }

    @Test
    void updateUserProgress_treatsNullCountersAsZero() {
        UserProgress progress = existing(null, null, null);

        UserProgress updated = service.updateUserProgress(7);

        assertSame(progress, updated);
        assertEquals(7, progress.getTotalXp());
        assertEquals(1, progress.getDailyStreak());
    }
}
