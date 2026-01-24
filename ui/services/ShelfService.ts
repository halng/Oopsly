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
import {
  ShelfCreateRequest,
  Shelf,
  ShelfPaginatedResponse,
  ShelfQueryParams,
  ShelfUpdateRequest,
} from "@/types/Shelf";
import { apiClient } from ".";

const SHELF_ENDPOINTS = {
  BASE: "/shelves",
  BY_ID: (id: string) => `/shelves/${id}`,
};

const fetchShelves = async (
  params?: ShelfQueryParams,
): Promise<ApiResponse<ShelfPaginatedResponse>> => {
  const response = await apiClient.get(SHELF_ENDPOINTS.BASE, { params });
  return response.data;
};

const getShelfById = async (id: string): Promise<ApiResponse<Shelf>> => {
  const response = await apiClient.get(SHELF_ENDPOINTS.BY_ID(id));
  return response.data;
};

const createShelf = async (
  data: ShelfCreateRequest,
): Promise<ApiResponse<Shelf>> => {
  const response = await apiClient.post(SHELF_ENDPOINTS.BASE, data);
  return response.data;
};

const updateShelve = async (
  id: string,
  data: ShelfUpdateRequest,
): Promise<ApiResponse<Shelf>> => {
  const response = await apiClient.put(SHELF_ENDPOINTS.BY_ID(id), data);
  return response.data;
};

const deleteShelf = async (id: string): Promise<ApiResponse<null>> => {
  const response = await apiClient.patch(SHELF_ENDPOINTS.BY_ID(id));
  return response.data;
};

export { createShelf, deleteShelf, fetchShelves, getShelfById, updateShelve };

