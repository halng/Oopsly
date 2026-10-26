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

package com.app.oopsly.api.leaderboard.application;

import com.app.oopsly.api.leaderboard.application.vm.LeaderboardUserRes;
import com.app.oopsly.api.leaderboard.domain.League;
import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.client.AuthProfile;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardServiceImpl implements LeaderboardService {

    private final UserProgressRepository progressRepository;
    private final AuthClient authClient;
    private final CurrentUser currentUser;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.LEADERBOARD, fallbackMethod = "leaderboardFallback")
    public ApiRes getGlobalLeaderboard(int limit) {
        UUID currentUserId = currentUser.id();
        List<UserProgress> top = progressRepository.findTopByXp(PageRequest.of(0, limit));
        Map<UUID, AuthProfile> profiles =
                authClient.lookup(top.stream().map(UserProgress::getUserId).toList());

        List<LeaderboardUserRes> rows = new ArrayList<>();
        for (int i = 0; i < top.size(); i++) {
            UserProgress progress = top.get(i);
            AuthProfile profile = profiles.get(progress.getUserId());
            int xp = progress.getTotalXp() == null ? 0 : progress.getTotalXp();
            rows.add(
                    new LeaderboardUserRes(
                            progress.getUserId(),
                            profile.label(),
                            profile.pictureUrl(),
                            xp,
                            progress.getDailyStreak() == null ? 0 : progress.getDailyStreak(),
                            i + 1,
                            League.of(xp).name(),
                            progress.getUserId().equals(currentUserId)));
        }

        return ApiRes.success(ApiMessages.LEADERBOARD_FETCHED, rows);
    }

    @SuppressWarnings("unused")
    private ApiRes leaderboardFallback(int limit, Throwable throwable) {
        if (throwable instanceof NotFoundException || throwable instanceof ValidationException) {
            throw (RuntimeException) throwable;
        }
        log.error("Leaderboard service degraded: {}", throwable.getMessage(), throwable);
        return ApiRes.retryLater(ApiMessages.LEADERBOARD_UNAVAILABLE);
    }
}
