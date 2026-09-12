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

package com.app.oopsly.api.subject;

import com.app.oopsly.api.shelf.Shelf;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    @Query(
            "SELECT c FROM Subject c WHERE c.id = ?1 AND c.shelf = ?2 AND c.deleted ="
                    + " false")
    Optional<Subject> findByIdAndShelve(UUID id, Shelf shelve);

    @Query("SELECT c FROM Subject c WHERE c.shelf = ?1 AND c.deleted = false")
    Page<Subject> findAllByShelve(Shelf shelve, Pageable pageable);

    @Query(
            "SELECT s FROM Subject s WHERE s.isPublic = true AND s.deleted = false AND"
                    + " (LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.description)"
                    + " LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Subject> findPublicByQuery(@Param("query") String query, Pageable pageable);

    @Query("SELECT s FROM Subject s WHERE s.isPublic = true AND s.deleted = false")
    Page<Subject> findAllPublic(Pageable pageable);
}
