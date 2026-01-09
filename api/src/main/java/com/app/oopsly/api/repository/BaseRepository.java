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

import com.app.oopsly.api.entity.User;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

@NoRepositoryBean
public interface BaseRepository<T, UUID> extends JpaRepository<T, UUID> {
    @Query("SELECT e FROM #{#entityName} e WHERE e.id = ?1 AND e.user = ?2 AND e.deleted = false")
    Optional<T> findByIdAndUser(UUID id, User user);

    @Query("SELECT e FROM #{#entityName} e WHERE e.user = ?1 AND e.deleted = false")
    Page<T> findAllByUser(User user, Pageable pageable);
}
