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

package com.app.oopsly.api.unit.leaderboard.interfaces.rest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.leaderboard.application.LeaderboardService;
import com.app.oopsly.api.leaderboard.interfaces.rest.LeaderboardController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LeaderboardControllerTest {

    @Mock private LeaderboardService leaderboardService;

    @InjectMocks private LeaderboardController leaderboardController;

    @Test
    void getGlobalLeaderboard_delegatesWithProvidedLimit() {
        ApiRes expected = ApiRes.success("ok");
        when(leaderboardService.getGlobalLeaderboard(10)).thenReturn(expected);

        assertSame(expected, leaderboardController.getGlobalLeaderboard(10));
        verify(leaderboardService).getGlobalLeaderboard(10);
    }

    @Test
    void getGlobalLeaderboard_supportsBoundaryLimits() {
        when(leaderboardService.getGlobalLeaderboard(1)).thenReturn(ApiRes.success("one"));
        when(leaderboardService.getGlobalLeaderboard(200)).thenReturn(ApiRes.success("max"));

        assertEquals("one", leaderboardController.getGlobalLeaderboard(1).getBody().message());
        assertEquals("max", leaderboardController.getGlobalLeaderboard(200).getBody().message());
    }

    @Test
    void getGlobalLeaderboard_propagatesDegradedResponses() {
        when(leaderboardService.getGlobalLeaderboard(50))
                .thenReturn(ApiRes.retryLater("unavailable"));

        assertFalse(leaderboardController.getGlobalLeaderboard(50).getBody().isSuccess());
    }
}
