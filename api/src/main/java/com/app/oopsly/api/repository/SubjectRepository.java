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

import com.app.oopsly.api.entity.ShelveEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface SubjectRepository extends JpaRepository<SubjectEntity, UUID> {
    @Query(
            "SELECT c FROM SubjectEntity c WHERE c.id = ?1 AND c.shelve = ?2 AND c.deleted ="
                    + " false")
    Optional<SubjectEntity> findByIdAndShelve(UUID id, ShelveEntity shelve);

    @Query("SELECT c FROM SubjectEntity c WHERE c.shelve = ?1 AND c.deleted = false")
    Page<SubjectEntity> findAllByShelve(ShelveEntity shelve, Pageable pageable);
}
