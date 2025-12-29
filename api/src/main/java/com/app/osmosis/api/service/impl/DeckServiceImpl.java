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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.entity.DeckEntity;
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.repository.DeckRepository;
import com.app.osmosis.api.service.DeckService;
import com.app.osmosis.api.service.UserService;
import com.app.osmosis.api.viewmodel.DeckReq;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeckServiceImpl implements DeckService {

    private final DeckRepository deckRepository;
    private final UserService userService;

    @Override
    public DeckEntity mapper(@NonNull DeckReq from, DeckEntity to) {
        if (to == null) {
            User currentUser = this.getCurrentUser();
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

    @Override
    public DeckReq toViewModel(DeckEntity from) {
        return new DeckReq(
                from.getName(),
                from.getDescription()
        );
    }

    @Override
    public DeckRepository getRepository() {
        return deckRepository;
    }

    @Override
    public User getCurrentUser() {
        return userService.getCurrentUser();
    }
}
