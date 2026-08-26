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

import { SubjectStats } from "./Subject";

export interface Shelf {
  id: string;
  icon: string;
  name: string;
  description: string | null;
  subjects: SubjectStats[];
}

export interface ShelfPaginatedResponse {
  entities: Shelf[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNextPage?: boolean;
}

export interface ShelfCreateRequest {
  icon: string;
  name: string;
  description?: string;
}

export interface ShelfUpdateRequest {
  icon?: string;
  name?: string;
  description?: string;
}

export interface ShelfQueryParams {
  page?: number;
  size?: number;
}
