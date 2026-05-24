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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.StatsService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.StatsRes;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {

    private final UserService userService;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;

    @Override
    public ApiRes getUserStats() {
        User currentUser = userService.getCurrentUser();
        log.info("Fetching stats for user: {}", currentUser.getId());

        List<ShelfEntity> shelves =
                shelfRepository
                        .findAllByUser(currentUser, PageRequest.of(0, Integer.MAX_VALUE))
                        .getContent();

        List<SubjectEntity> subjects =
                shelves.stream()
                        .flatMap(
                                shelf ->
                                        subjectRepository
                                                .findAllByShelve(
                                                        shelf, PageRequest.of(0, Integer.MAX_VALUE))
                                                .getContent()
                                                .stream())
                        .collect(Collectors.toList());

        long totalCards =
                subjects.stream().mapToLong(cardRepository::countBySubjectAndDeletedFalse).sum();

        long dueCards = subjects.stream().mapToLong(cardRepository::countOverdue).sum();

        Instant startOfDay = LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endOfDay = startOfDay.plus(1, ChronoUnit.DAYS);
        long cardsReviewedToday =
                subjects.stream()
                        .mapToLong(s -> cardRepository.countReviewedToday(s, startOfDay, endOfDay))
                        .sum();

        double retentionRate = totalCards == 0 ? 0.0 : 100.0 - (dueCards * 100.0) / totalCards;

        StatsRes stats =
                new StatsRes(
                        currentUser.getDailyStreak() != null ? currentUser.getDailyStreak() : 0,
                        currentUser.getTotalXp() != null ? currentUser.getTotalXp() : 0,
                        (int) cardsReviewedToday,
                        totalCards,
                        dueCards,
                        retentionRate);

        return ApiRes.success("Stats fetched successfully", stats);
    }
}
