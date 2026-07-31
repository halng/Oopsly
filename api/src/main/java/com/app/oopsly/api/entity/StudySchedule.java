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

package com.app.oopsly.api.entity;

import java.util.ArrayList;
import java.util.List;
import lombok.*;

/**
 * Study schedule preference stored as jsonb.
 *
 * <p>studyDays uses JS Date.getDay() convention: 0=Sunday … 6=Saturday.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySchedule {

    private String preferredStudyTime;

    @Builder.Default private List<Integer> studyDays = new ArrayList<>();

    @Builder.Default private Boolean reminderEnabled = false;

    public static StudySchedule defaults() {
        return StudySchedule.builder()
                .preferredStudyTime("09:00")
                .studyDays(new ArrayList<>(List.of(1, 2, 3, 4, 5)))
                .reminderEnabled(false)
                .build();
    }
}
