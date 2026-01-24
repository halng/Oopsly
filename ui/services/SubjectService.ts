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
import { SubjectStats, SubjectCreateRequest } from "@/types/Subject";
import { apiClient } from ".";

const SUBJECT_ENDPOINTS = {
  BASE: "/shelves/{shelfId}/subjects",
  BY_ID: (id: string) => `/shelves/{shelfId}/subjects/${id}`,
};

// const fetchSubjects = async (
//   params?: SubjectQueryParams,
// ): Promise<ApiResponse<SubjectPaginatedResponse>> => {
//   const response = await apiClient.get(SUBJECT_ENDPOINTS.BASE, { params });
//   return response.data;
// };

// const getSubjectById = async (id: string): Promise<ApiResponse<Subject>> => {
//   const response = await apiClient.get(SUBJECT_ENDPOINTS.BY_ID(id));
//   return response.data;
// };

const createSubject = async (
  shelfId: string,
  data: SubjectCreateRequest,
): Promise<ApiResponse<SubjectStats>> => {
  const endpoint = SUBJECT_ENDPOINTS.BASE.replace("{shelfId}", shelfId);
  const response = await apiClient.post(endpoint, data);
  return response.data;
};

export { createSubject };
