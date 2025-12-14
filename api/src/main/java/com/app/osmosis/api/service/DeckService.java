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

package com.app.osmosis.api.service;

import com.app.osmosis.api.viewmodel.ApiRes;
import com.app.osmosis.api.viewmodel.CreateDeck;
import com.app.osmosis.api.viewmodel.UpdateDeck;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface DeckService {
    ApiRes createDeck(CreateDeck createDeck, UUID userId);

    ApiRes getAllDecks(Pageable pageable);

    ApiRes getDeckById(UUID id);

    ApiRes updateDeck(UUID id, UpdateDeck updateDeck, UUID userId);

    ApiRes softDeleteDeck(UUID id, UUID userId);
}
