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

package com.app.oopsly.api.unit.leaderboard.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.leaderboard.application.LeaderboardServiceImpl;
import com.app.oopsly.api.leaderboard.application.vm.LeaderboardUserRes;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserRepository;
import com.app.oopsly.api.user.UserService;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class LeaderboardServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private UserService userService;

    @InjectMocks private LeaderboardServiceImpl leaderboardService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = user("Me", "Me display", 5000, 12);
    }

    private User user(String name, String displayName, Integer xp, Integer streak) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName(name);
        user.setDisplayName(displayName);
        user.setPictureUrl("https://cdn/" + name + ".png");
        Setting setting = new Setting();
        setting.setTotalXp(xp);
        setting.setDailyStreak(streak);
        user.setSetting(setting);
        return user;
    }

    @SuppressWarnings("unchecked")
    private static List<LeaderboardUserRes> rowsOf(ApiRes response) {
        return (List<LeaderboardUserRes>) response.getBody().data();
    }

    private Object invokeFallback(int limit, Throwable throwable) throws Exception {
        Method method =
                LeaderboardServiceImpl.class.getDeclaredMethod(
                        "leaderboardFallback", int.class, Throwable.class);
        method.setAccessible(true);
        try {
            return method.invoke(leaderboardService, limit, throwable);
        } catch (InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    @Test
    void getGlobalLeaderboard_ranksUsersAndFlagsCurrentUser() {
        User top = user("Top", "Top display", 12000, 40);
        User other = user("Other", null, 800, 1);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findTopByXp(any(PageRequest.class)))
                .thenReturn(List.of(top, currentUser, other));

        ApiRes response = leaderboardService.getGlobalLeaderboard(50);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<LeaderboardUserRes> rows = rowsOf(response);
        assertEquals(3, rows.size());

        assertEquals(1, rows.get(0).rank());
        assertEquals("Top display", rows.get(0).displayName());
        assertEquals("DIAMOND", rows.get(0).league());
        assertFalse(rows.get(0).isCurrentUser());

        assertEquals(2, rows.get(1).rank());
        assertTrue(rows.get(1).isCurrentUser());
        assertEquals("GOLD", rows.get(1).league());

        assertEquals(3, rows.get(2).rank());
        // falls back to the technical name when no display name is set
        assertEquals("Other", rows.get(2).displayName());
        assertEquals("BRONZE", rows.get(2).league());
    }

    @Test
    void getGlobalLeaderboard_usesRequestedLimitForPagination() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findTopByXp(any(PageRequest.class))).thenReturn(List.of());

        leaderboardService.getGlobalLeaderboard(7);

        ArgumentCaptor<PageRequest> captor = ArgumentCaptor.forClass(PageRequest.class);
        verify(userRepository).findTopByXp(captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(7, captor.getValue().getPageSize());
    }

    @Test
    void getGlobalLeaderboard_withNoUsersReturnsEmptyList() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findTopByXp(any(PageRequest.class))).thenReturn(List.of());

        ApiRes response = leaderboardService.getGlobalLeaderboard(50);

        assertTrue(response.getBody().isSuccess());
        assertTrue(rowsOf(response).isEmpty());
    }

    @Test
    void getGlobalLeaderboard_handlesNullXpAndStreak() {
        User rookie = user("Rookie", null, null, null);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(userRepository.findTopByXp(any(PageRequest.class))).thenReturn(List.of(rookie));

        List<LeaderboardUserRes> rows = rowsOf(leaderboardService.getGlobalLeaderboard(50));

        assertEquals(0, rows.get(0).xp());
        assertEquals(0, rows.get(0).streakDays());
        assertEquals("BRONZE", rows.get(0).league());
    }

    @Test
    void getGlobalLeaderboard_zeroLimitIsRejectedByPageRequest() {
        when(userService.getCurrentUser()).thenReturn(currentUser);

        assertThrows(
                IllegalArgumentException.class, () -> leaderboardService.getGlobalLeaderboard(0));
    }

    @Test
    void fallback_rethrowsDomainExceptions() {
        assertThrows(
                ValidationException.class,
                () -> invokeFallback(50, new ValidationException("bad")));
        assertThrows(
                NotFoundException.class, () -> invokeFallback(50, new NotFoundException("gone")));
    }

    @Test
    void fallback_returnsServiceUnavailableForInfrastructureFailures() throws Exception {
        ApiRes response = (ApiRes) invokeFallback(50, new IllegalStateException("redis down"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertFalse(response.getBody().isSuccess());
    }
}
