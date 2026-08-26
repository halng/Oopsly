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

import { ApiResponse } from '@/types/ApiRes';
import { apiClient } from '.';

export interface PublicDeck {
  id: string;
  name: string;
  description?: string;
  cardCount?: number;
}

export interface DiscoverPaginatedResponse {
  entities: PublicDeck[];
  totalItems: number;
  hasNextPage: boolean;
}

const discoverDecks = async (
  query: string,
  page: number,
  size: number,
): Promise<ApiResponse<DiscoverPaginatedResponse>> => {
  const response = await apiClient.get(
    `/discover?q=${encodeURIComponent(query)}&page=${page}&size=${size}`,
  );
  return response.data;
};

const cloneDeck = async (subjectId: string): Promise<ApiResponse<unknown>> => {
  const response = await apiClient.post(`/discover/${subjectId}/clone`);
  return response.data;
};

export { discoverDecks, cloneDeck };
