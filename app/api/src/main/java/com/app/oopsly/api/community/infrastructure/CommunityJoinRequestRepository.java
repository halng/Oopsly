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

package com.app.oopsly.api.community.infrastructure;

import com.app.oopsly.api.community.domain.CommunityJoinRequestEntity;
import com.app.oopsly.api.community.domain.JoinRequestStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityJoinRequestRepository
        extends JpaRepository<CommunityJoinRequestEntity, UUID> {

    List<CommunityJoinRequestEntity> findAllByCommunityIdAndStatus(
            UUID communityId, JoinRequestStatus status);

    List<CommunityJoinRequestEntity> findAllByUserIdAndStatus(
            UUID userId, JoinRequestStatus status);

    Optional<CommunityJoinRequestEntity> findByCommunityIdAndUserIdAndStatus(
            UUID communityId, UUID userId, JoinRequestStatus status);

    Optional<CommunityJoinRequestEntity> findByIdAndCommunityId(UUID id, UUID communityId);
}
