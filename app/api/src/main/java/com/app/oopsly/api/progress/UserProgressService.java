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

package com.app.oopsly.api.progress;

import com.app.oopsly.api.shared.security.CurrentUser;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProgressService {

    private final UserProgressRepository repository;
    private final CurrentUser currentUser;

    /** Progress of the caller; created lazily so new users need no provisioning step. */
    @Transactional
    public UserProgress getCurrent() {
        return getOrCreate(currentUser.id());
    }

    @Transactional
    public UserProgress getOrCreate(UUID userId) {
        return repository
                .findByUserId(userId)
                .orElseGet(
                        () -> {
                            repository.insertIfAbsent(UUID.randomUUID(), userId);
                            return repository.findByUserId(userId).orElseThrow();
                        });
    }

    /** Adds XP and advances the daily streak for the caller. Returns the updated progress. */
    @Transactional
    public UserProgress updateUserProgress(int xpGained) {
        UUID userId = currentUser.id();
        getOrCreate(userId);
        UserProgress progress = repository.findByUserIdWithLock(userId).orElseThrow();
        Instant now = Instant.now();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        int currentStreak = progress.getDailyStreak() != null ? progress.getDailyStreak() : 0;
        int currentXp = progress.getTotalXp() != null ? progress.getTotalXp() : 0;

        if (progress.getLastReviewedAt() != null) {
            LocalDate lastReviewDate =
                    progress.getLastReviewedAt().atZone(ZoneOffset.UTC).toLocalDate();
            if (lastReviewDate.equals(today.minusDays(1))) {
                currentStreak += 1;
            } else if (!lastReviewDate.equals(today)) {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }

        progress.setTotalXp(currentXp + xpGained);
        progress.setDailyStreak(currentStreak);
        progress.setLastReviewedAt(now);
        repository.save(progress);
        log.info("Updated user progress: xp={}, streak={}", currentXp + xpGained, currentStreak);
        return progress;
    }
}
