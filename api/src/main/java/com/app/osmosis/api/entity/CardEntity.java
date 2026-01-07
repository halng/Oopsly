/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cards")
@Entity
public class CardEntity extends Audit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deck_id")
    private DeckEntity deck;

    @Column(nullable = false, length = 2000)
    private String prompt;

    @Column(nullable = false, length = 4000)
    private String answer;

    @Column(name = "due_at")
    private Instant dueAt;

    @Column(name = "interval_minutes")
    private int intervalMinutes;

    @PrePersist
    public void initializeSchedule() {
        if (dueAt == null) {
            dueAt = Instant.now();
        }
        if (intervalMinutes == 0) {
            intervalMinutes = 10;
        }
    }

    public void scheduleNext(boolean answeredCorrectly) {
        int nextInterval = answeredCorrectly ? Math.max(intervalMinutes * 2, 10) : 5;
        intervalMinutes = nextInterval;
        dueAt = Instant.now().plusSeconds((long) intervalMinutes * 60);
    }
}
