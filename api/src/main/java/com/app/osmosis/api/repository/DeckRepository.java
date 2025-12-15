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

package com.app.osmosis.api.repository;

import com.app.osmosis.api.entity.DeckEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeckRepository extends JpaRepository<DeckEntity, UUID> {
    Page<DeckEntity> findByIsDeletedFalse(Pageable pageable);

    Page<DeckEntity> findByUserIdAndIsDeletedFalse(UUID userId, Pageable pageable);

    Optional<DeckEntity> findByIdAndIsDeletedFalse(UUID id);

    Optional<DeckEntity> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);
}
