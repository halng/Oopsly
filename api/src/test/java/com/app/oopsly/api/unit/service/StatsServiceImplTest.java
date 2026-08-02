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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.service.impl.StatsServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.StatsRes;
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

    @InjectMocks private StatsServiceImpl statsService;

    private User user;
    private ShelfEntity shelf;
    private SubjectEntity subject;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setDailyStreak(3);
        user.setTotalXp(120);

        shelf = new ShelfEntity();
        shelf.setId(UUID.randomUUID());
        shelf.setUser(user);

        subject = new SubjectEntity();
        subject.setId(UUID.randomUUID());
        subject.setShelf(shelf);
    }

    @Test
    void getUserStats_withCards_computesRetention() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(shelf)));
        when(subjectRepository.findAllByShelve(eq(shelf), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(subject)));
        when(cardRepository.countBySubjectAndDeletedFalse(subject)).thenReturn(10L);
        when(cardRepository.countOverdue(subject)).thenReturn(2L);
        when(cardRepository.countReviewedToday(eq(subject), any(), any())).thenReturn(4L);

        ApiRes result = statsService.getUserStats();

        assertTrue(result.getBody().isSuccess());
        StatsRes stats = (StatsRes) result.getBody().data();
        assertEquals(3, stats.dailyStreak());
        assertEquals(120, stats.totalXp());
        assertEquals(4, stats.cardsReviewedToday());
        assertEquals(10L, stats.totalCards());
        assertEquals(2L, stats.dueCards());
        assertEquals(80.0, stats.retentionRate());
    }

    @Test
    void getUserStats_withNoCards_returnsZeroRetentionAndNullSafeXp() {
        user.setDailyStreak(null);
        user.setTotalXp(null);
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findAllByUser(eq(user), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ApiRes result = statsService.getUserStats();

        StatsRes stats = (StatsRes) result.getBody().data();
        assertEquals(0, stats.dailyStreak());
        assertEquals(0, stats.totalXp());
        assertEquals(0L, stats.totalCards());
        assertEquals(0.0, stats.retentionRate());
    }
}
