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

package com.app.oopsly.api.testsuite.infrastructure;

import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TestSuiteRepository extends JpaRepository<TestSuiteEntity, UUID> {
    @Query(
            "SELECT t FROM TestSuiteEntity t WHERE t.id = ?1 AND t.shelf = ?2 AND t.deleted ="
                    + " false")
    Optional<TestSuiteEntity> findByIdAndShelve(UUID id, Shelf shelve);

    @Query(
            "SELECT t FROM TestSuiteEntity t WHERE t.shelf = ?1 AND t.deleted = false ORDER BY"
                    + " t.createdAt, t.id")
    List<TestSuiteEntity> findAllByShelve(Shelf shelve);

    @Query(
            "SELECT t.slug FROM TestSuiteEntity t WHERE t.shelf = ?1 AND t.deleted = false AND"
                    + " t.id <> ?2")
    List<String> findSlugsByShelfExcluding(Shelf shelve, UUID excludeId);

    /** Public test suites the user neither owns nor has already cloned. */
    @Query(
            "SELECT t FROM TestSuiteEntity t WHERE t.isPublic = true AND t.deleted = false AND"
                    + " t.shelf.deleted = false AND t.shelf.userId <> :userId AND NOT EXISTS"
                    + " (SELECT 1 FROM TestSuiteEntity c WHERE c.clonedFromId = t.id AND c.deleted"
                    + " = false AND c.shelf.userId = :userId)")
    Page<TestSuiteEntity> findAllPublic(@Param("userId") UUID userId, Pageable pageable);

    @Query(
            "SELECT t FROM TestSuiteEntity t WHERE t.isPublic = true AND t.deleted = false AND"
                    + " t.shelf.deleted = false AND t.shelf.userId <> :userId AND NOT EXISTS"
                    + " (SELECT 1 FROM TestSuiteEntity c WHERE c.clonedFromId = t.id AND c.deleted"
                    + " = false AND c.shelf.userId = :userId) AND (LOWER(t.title) LIKE"
                    + " LOWER(CONCAT('%', :query, '%')) OR LOWER(t.description) LIKE"
                    + " LOWER(CONCAT('%', :query, '%')))")
    Page<TestSuiteEntity> findPublicByQuery(
            @Param("query") String query, @Param("userId") UUID userId, Pageable pageable);

    @Query(
            "SELECT COUNT(c) > 0 FROM TestSuiteEntity c WHERE c.clonedFromId = :sourceId AND"
                    + " c.deleted = false AND c.shelf.userId = :userId")
    boolean hasCloneOf(@Param("sourceId") UUID sourceId, @Param("userId") UUID userId);

    // TODO(ai): used by the card-based preset run.
    @Query(
            "SELECT DISTINCT t FROM TestSuiteEntity t LEFT JOIN FETCH t.subjects WHERE t.id = :id"
                    + " AND t.shelf = :shelf AND t.deleted = false")
    Optional<TestSuiteEntity> findByIdAndShelveWithSubjects(
            @Param("id") UUID id, @Param("shelf") Shelf shelf);
}
