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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.entity.DeckEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.DeckRepository;
import com.app.oopsly.api.service.DeckService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.DeckPageRes;
import com.app.oopsly.api.viewmodel.DeckReq;
import com.app.oopsly.api.viewmodel.DeckRes;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeckServiceImpl implements DeckService {

    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    public ApiRes create(DeckReq request) {
        DeckEntity savedEntity = deckRepository.save(this.toEntity(request, null));
        return ApiRes.success("Created successfully", this.toViewModel(savedEntity));
    }

    @Override
    public ApiRes update(DeckReq request, UUID id) {
        DeckEntity existingEntity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(() -> new NotFoundException("Entity not found with id: " + id));

        DeckEntity newEntity = this.toEntity(request, existingEntity);
        deckRepository.save(newEntity);
        return ApiRes.success("Updated successfully");
    }

    @Override
    public ApiRes delete(UUID id) {
        DeckEntity existingEntity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(() -> new NotFoundException("Entity not found with id: " + id));

        existingEntity.setDeleted(true);
        deckRepository.save(existingEntity);
        return ApiRes.success("Deleted successfully");
    }

    @Override
    public ApiRes getById(UUID id) {
        DeckEntity entity =
                deckRepository
                        .findByIdAndUser(id, this.currentUser())
                        .orElseThrow(() -> new NotFoundException("Entity not found with id: " + id));
        return ApiRes.success("Fetched successfully", this.toViewModel(entity));
    }

    @Override
    public ApiRes getAll(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<DeckEntity> pageData = deckRepository.findAllByUser(this.currentUser(), pageable);
        List<DeckRes> entities = pageData.getContent().stream().map(this::toViewModel).toList();

        DeckPageRes response =
                new DeckPageRes(
                        entities,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext());
        return ApiRes.success("Fetched successfully", response);
    }

    DeckEntity toEntity(@NonNull DeckReq from, DeckEntity to) {
        if (to == null) {
            User currentUser = this.currentUser();
            return DeckEntity.builder()
                    .name(from.name())
                    .description(from.description())
                    .user(currentUser)
                    .build();
        }

        to.setName(from.name());
        to.setDescription(from.description());
        return to;
    }

    DeckRes toViewModel(DeckEntity from) {
        return new DeckRes(from.getId(), from.getName(), from.getDescription());
    }

    User currentUser() {
        return userService.getCurrentUser();
    }
}
