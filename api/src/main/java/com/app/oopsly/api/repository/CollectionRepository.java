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

package com.app.oopsly.api.repository;

import com.app.oopsly.api.entity.CollectionEntity;
import com.app.oopsly.api.entity.DeckEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionRepository extends JpaRepository<CollectionEntity, UUID> {
    @Query(
            "SELECT c FROM CollectionEntity c WHERE c.id = ?1 AND c.deck = ?2 AND c.deleted ="
                    + " false")
    Optional<CollectionEntity> findByIdAndDeck(UUID id, DeckEntity deck);

    @Query("SELECT c FROM CollectionEntity c WHERE c.deck = ?1 AND c.deleted = false")
    Page<CollectionEntity> findAllByDeck(DeckEntity deck, Pageable pageable);
}
