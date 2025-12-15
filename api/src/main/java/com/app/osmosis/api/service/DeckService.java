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
import com.app.osmosis.api.viewmodel.DeckReq;
import com.app.osmosis.api.viewmodel.UpdateDeckReq;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface DeckService {
    /**
     * Creates a new deck for the specified user.
     *
     * @param deckReq the deck creation request containing name and description
     * @return ApiRes with HTTP 201 status and the created deck data
     */
    ApiRes createDeck(DeckReq deckReq);

    /**
     * Retrieves all active (non-deleted) decks with pagination.
     *
     * @param pageable pagination parameters (page, size, sort)
     * @return ApiRes with HTTP 200 status and paginated deck data
     */
    ApiRes getAllDecks(Pageable pageable);

    /**
     * Retrieves a specific deck by its ID.
     *
     * @param id the UUID of the deck to retrieve
     * @return ApiRes with HTTP 200 status and the deck data, or HTTP 404 if not found
     */
    ApiRes getDeckById(UUID id);

    /**
     * Updates an existing deck with new information.
     *
     * @param id the UUID of the deck to update
     * @param updateDeckReq the update request containing new name and description
     * @return ApiRes with HTTP 200 status and updated deck data, HTTP 404 if not found, or HTTP 403
     *     if unauthorized
     */
    ApiRes updateDeck(UUID id, UpdateDeckReq updateDeckReq);

    /**
     * Soft deletes a deck by setting its isDeleted flag to true.
     *
     * @param id the UUID of the deck to delete
     * @return ApiRes with HTTP 200 status on success, HTTP 404 if not found, or HTTP 403 if
     *     unauthorized
     */
    ApiRes softDeleteDeck(UUID id);
}
