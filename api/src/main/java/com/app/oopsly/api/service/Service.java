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

package com.app.oopsly.api.service;

import com.app.oopsly.api.entity.Audit;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.BaseRepository;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * Generic service interface providing CRUD operations for entities.
 *
 * @param <T> the type of the entity
 * @param <S> the type of the request object used for creating/updating the entity
 */
public interface Service<T, S> {

    /**
     * Creates a new entity in the database.
     *
     * @param request the entity to be created
     * @return ApiRes containing success message and the saved entity
     */
    default ApiRes create(S request) {
        T savedEntity = getRepository().save(this.toEntity(request, null));
        return ApiRes.success("Created successfully", this.toViewModel(savedEntity));
    }

    /**
     * Updates an existing entity in the database.
     *
     * @param request the entity with updated data
     * @param id the identifier of the entity to update
     * @return ApiRes containing success message
     * @throws NotFoundException if the entity with given id is not found
     */
    default ApiRes update(S request, UUID id) {
        T existingEntity =
                getRepository()
                        .findByIdAndUser(id, this.getCurrentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        T newEntity = this.toEntity(request, existingEntity);
        getRepository().save(newEntity);
        return ApiRes.success("Updated successfully");
    }

    /**
     * Soft deletes an entity by setting its deleted flag to true (for Audit entities). Returns an
     * error for non-Audit entities.
     *
     * @param id the identifier of the entity to delete
     * @return ApiRes containing success or error message
     * @throws NotFoundException if the entity with given id is not found
     */
    default ApiRes delete(UUID id) {
        T existingEntity =
                getRepository()
                        .findByIdAndUser(id, this.getCurrentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));

        if (existingEntity instanceof Audit entity) {
            entity.setDeleted(true);
            getRepository().save((T) entity);
            return ApiRes.success("Deleted successfully");
        }

        return ApiRes.error("Something went wrong during delete operation");
    }

    /**
     * Retrieves an entity by its identifier.
     *
     * @param id the identifier of the entity to retrieve
     * @return ApiRes containing success message and the fetched entity
     * @throws NotFoundException if the entity with given id is not found
     */
    default ApiRes getById(UUID id) {
        T entity =
                getRepository()
                        .findByIdAndUser(id, this.getCurrentUser())
                        .orElseThrow(
                                () -> new NotFoundException("Entity not found with id: " + id));
        return ApiRes.success("Fetched successfully", entity);
    }

    /**
     * Retrieves all entities with pagination support.
     *
     * @param page the page number (zero-based)
     * @param size the number of items per page
     * @return ApiRes containing pagination metadata and list of entities
     */
    default ApiRes getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<T> pageData = getRepository().findAllByUser(this.getCurrentUser(), pageable);
        List<T> entities = pageData.getContent();

        HashMap<String, Object> response = new HashMap<>();
        response.put("entities", entities);
        response.put("currentPage", pageable.getPageNumber());
        response.put("totalItems", pageData.getTotalElements());
        response.put("totalPages", pageData.getTotalPages());
        response.put("hasNextPage", pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    /**
     * Maps the request data to the existing entity. Implementations should define how to merge
     * request data with existing entity.
     *
     * @param from the entity containing new data
     * @param to the existing entity to be updated, if null, a new entity should be created
     * @return the updated entity with merged data
     */
    T toEntity(S from, T to);

    /**
     * Unmaps the entity to the request object. Implementations should define how to convert entity
     * data back to request format.
     *
     * @param from the entity to be converted
     * @return the request object representing the entity data
     */
    S toViewModel(T from);

    /**
     * Provides the JPA repository for database operations.
     *
     * @return the JPA repository instance for type T with key type K
     */
    BaseRepository<T, UUID> getRepository();

    /**
     * Retrieves the currently authenticated user.
     *
     * @return the current User entity
     */
    User getCurrentUser();
}
