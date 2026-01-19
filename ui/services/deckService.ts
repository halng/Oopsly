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

import { apiClient } from '@/config/axiosClient';
import { ApiResponse } from '@/types/ApiRes';
import {
  Deck,
  DeckPaginatedResponse,
  DeckCreateRequest,
  DeckUpdateRequest,
  DeckQueryParams,
} from '@/types/Deck';

const DECK_ENDPOINTS = {
  BASE: '/decks',
  BY_ID: (id: string) => `/decks/${id}`,
};

const fetchDecks = async (
  params?: DeckQueryParams
): Promise<ApiResponse<DeckPaginatedResponse>> => {
  const response = await apiClient.get(DECK_ENDPOINTS.BASE, { params });
  return response.data;
};

const getDeckById = async (id: string): Promise<ApiResponse<Deck>> => {
  const response = await apiClient.get(DECK_ENDPOINTS.BY_ID(id));
  return response.data;
};

const createDeck = async (
  data: DeckCreateRequest
): Promise<ApiResponse<Deck>> => {
  const response = await apiClient.post(DECK_ENDPOINTS.BASE, data);
  return response.data;
};

const updateDeck = async (
  id: string,
  data: DeckUpdateRequest
): Promise<ApiResponse<Deck>> => {
  const response = await apiClient.put(DECK_ENDPOINTS.BY_ID(id), data);
  return response.data;
};

const deleteDeck = async (id: string): Promise<ApiResponse<null>> => {
  const response = await apiClient.patch(DECK_ENDPOINTS.BY_ID(id));
  return response.data;
};

export const deckService = {
  fetchDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
};
