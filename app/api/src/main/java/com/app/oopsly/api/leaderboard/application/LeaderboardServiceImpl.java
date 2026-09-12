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
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import com.app.oopsly.api.user.UserService;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardServiceImpl implements LeaderboardService {

    private final UserRepository userRepository;
    private final UserService userService;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.LEADERBOARD, fallbackMethod = "leaderboardFallback")
    public ApiRes getGlobalLeaderboard(int limit) {
        User currentUser = userService.getCurrentUser();
        List<User> topUsers = userRepository.findTopByXp(PageRequest.of(0, limit));

        List<LeaderboardUserRes> rows = new ArrayList<>();
        for (int i = 0; i < topUsers.size(); i++) {
            User user = topUsers.get(i);
            int xp = user.getSetting().getTotalXp() == null ? 0 : user.getSetting().getTotalXp();
            rows.add(
                    new LeaderboardUserRes(
                            user.getId(),
                            user.getDisplayName() != null ? user.getDisplayName() : user.getName(),
                            user.getPictureUrl(),
                            xp,
                            user.getSetting().getDailyStreak() == null ? 0 : user.getSetting().getDailyStreak(),
                            i + 1,
                            League.of(xp).name(),
                            user.getId().equals(currentUser.getId())));
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
