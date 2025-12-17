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

import { apiClient } from '../config/axiosClient';
import { ApiResponse } from '../types/api';
import { Deck, CreateDeckVm, UpdateDeckVm, DeckPaginatedResponse } from '../types/Deck';

export interface FetchDecksParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export const deckService = {
  async fetchDecks(params?: FetchDecksParams): Promise<ApiResponse<DeckPaginatedResponse>> {
    const response = await apiClient.get<ApiResponse<DeckPaginatedResponse>>('/decks', {
      params,
    });
    return response.data;
  },

  async createDeck(data: CreateDeckVm): Promise<ApiResponse<Deck>> {
    const response = await apiClient.post<ApiResponse<Deck>>('/decks', data);
    return response.data;
  },

  async updateDeck(id: string, data: UpdateDeckVm): Promise<ApiResponse<Deck>> {
    const response = await apiClient.put<ApiResponse<Deck>>(`/decks/${id}`, data);
    return response.data;
  },

  async deleteDeck(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.patch<ApiResponse<null>>(`/decks/${id}`);
    return response.data;
  },
};
