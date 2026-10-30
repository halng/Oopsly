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

package com.app.oopsly.api.progress;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProgressRepository extends JpaRepository<UserProgress, UUID> {

    Optional<UserProgress> findByUserId(UUID userId);

    List<UserProgress> findAllByUserIdIn(Collection<UUID> userIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM UserProgress p WHERE p.userId = :userId")
    Optional<UserProgress> findByUserIdWithLock(@Param("userId") UUID userId);

    /**
     * Creates the row unless one exists. Atomic, so concurrent first requests (a login fires
     * several at once) cannot collide on the user_id unique constraint.
     */
    @Modifying
    @Query(
            value =
                    "INSERT INTO cms.user_progress (id, created_at, updated_at, deleted, user_id)"
                            + " VALUES (:id, now(), now(), false, :userId)"
                            + " ON CONFLICT (user_id) DO NOTHING",
            nativeQuery = true)
    void insertIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT p FROM UserProgress p WHERE p.deleted = false ORDER BY p.totalXp DESC")
    List<UserProgress> findTopByXp(Pageable pageable);
}
