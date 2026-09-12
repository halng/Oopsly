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

package com.app.oopsly.api.community.domain;

import com.app.oopsly.api.shared.domain.Audit;
import com.app.oopsly.api.user.User;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/** Membership of a user in a community. */
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "community_members",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_community_member",
                        columnNames = {"community_id", "user_id"}))
@Entity
public class CommunityMemberEntity extends Audit {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    private CommunityEntity community;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CommunityRole role = CommunityRole.MEMBER;

    @Builder.Default private Integer cardsStudiedThisWeek = 0;

    @Builder.Default private Instant joinedAt = Instant.now();
}
