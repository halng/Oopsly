import { create } from 'zustand';
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

import { ApiResponse } from "@/types/ApiRes";
import { CardCreateRequest, CardPaginatedResponse, ReviewedFlashcard } from "@/types/Card";
import { apiClient } from ".";

const CARD_ENDPOINTS = {
  BASE: (shelfId: string, subjectId: string) =>
    `/shelves/${shelfId}/subjects/${subjectId}/cards`,
  BY_ID: (shelfId: string, subjectId: string, id: string) => `/shelves/${shelfId}/subjects/${subjectId}/cards/${id}`,
};

const fetchCardsDataBySubjectAndShelf = async (
  shelfId: string,
  subjectId: string,
): Promise<ApiResponse<CardPaginatedResponse>> => {
  const response = await apiClient.get(
    CARD_ENDPOINTS.BASE(shelfId, subjectId),
    {
        params: {
            page: 0,
            size: 1000,
        },
    }
  );
  return response.data;
};

const createNewCard = async (
  shelfId: string,
  subjectId: string,
  cards: CardCreateRequest[],
): Promise<ApiResponse<any>> => {
  const response = await apiClient.post(
    CARD_ENDPOINTS.BASE(shelfId, subjectId),
    {"cards": cards},
  );
  return response.data;
};

const updateCard = async (
  shelfId: string,
  subjectId: string,
  cardId: string,
  data: CardCreateRequest,
): Promise<ApiResponse<any>> => {
  const endpoint = CARD_ENDPOINTS.BY_ID(shelfId, subjectId, cardId);
  const response = await apiClient.put(endpoint, data);
  return response.data;
};

const deleteCard = async (
  shelfId: string,
  subjectId: string,
  cardId: string,
): Promise<ApiResponse<any>> => {
  const endpoint = CARD_ENDPOINTS.BY_ID(shelfId, subjectId, cardId);
  const response = await apiClient.patch(endpoint);
  return response.data;
}

const updateDifficultyLevels = async (
  shelfId: string,
  subjectId: string,
  reviewedFlashcards: ReviewedFlashcard[],
): Promise<ApiResponse<any>> => {
  const endpoint = `${CARD_ENDPOINTS.BASE(shelfId, subjectId)}/difficulty`;
  const response = await apiClient.put(endpoint, reviewedFlashcards );
  return response.data;
}

export { fetchCardsDataBySubjectAndShelf, createNewCard, updateCard, deleteCard, updateDifficultyLevels };