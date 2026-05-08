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

import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.TestSuiteEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TestSuiteRepository extends JpaRepository<TestSuiteEntity, UUID> {
    @Query(
            "SELECT t FROM TestSuiteEntity t WHERE t.id = ?1 AND t.shelf = ?2 AND t.deleted ="
                    + " false")
    Optional<TestSuiteEntity> findByIdAndShelve(UUID id, ShelfEntity shelve);

    @Query("SELECT t FROM TestSuiteEntity t WHERE t.shelf = ?1 AND t.deleted = false")
    List<TestSuiteEntity> findAllByShelve(ShelfEntity shelve);

    @Query(
            "SELECT DISTINCT t FROM TestSuiteEntity t LEFT JOIN FETCH t.subjects WHERE t.id = :id"
                    + " AND t.shelf = :shelf AND t.deleted = false")
    Optional<TestSuiteEntity> findByIdAndShelveWithSubjects(
            @Param("id") UUID id, @Param("shelf") ShelfEntity shelf);
}
