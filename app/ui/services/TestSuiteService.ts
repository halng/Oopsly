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
import { TestRunCardRes } from "@/types/Card";
import { apiClient } from ".";

const TEST_SUITE_ENDPOINTS = {
  BY_SHELF: (shelfId: string) => `/shelves/${shelfId}/test-suites`,
  BY_ID: (shelfId: string, id: string) => `/shelves/${shelfId}/test-suites/${id}`,
  RUN: (shelfId: string, id: string) =>
    `/shelves/${shelfId}/test-suites/${id}/run`,
};

export interface TestSuiteSelectionPayload {
  mode?: "ALL" | "DUE_ONLY" | "RANDOM";
  limit?: number;
  shuffle?: boolean;
}

export interface TestSuiteRes {
  id: string;
  title: string;
  isActive: boolean;
  subjectIds?: string[];
  selection?: TestSuiteSelectionPayload | null;
}

export interface TestSuiteCreateReq {
  title: string;
  isActive?: boolean;
  subjectIds?: string[];
  selection?: TestSuiteSelectionPayload;
}

const fetchTestSuitesByShelf = async (
  shelfId: string,
): Promise<ApiResponse<TestSuiteRes[]>> => {
  const response = await apiClient.get(TEST_SUITE_ENDPOINTS.BY_SHELF(shelfId));
  return response.data;
};

const createTestSuite = async (
  shelfId: string,
  data: TestSuiteCreateReq,
): Promise<ApiResponse<TestSuiteRes>> => {
  const response = await apiClient.post(TEST_SUITE_ENDPOINTS.BY_SHELF(shelfId), {
    title: data.title,
    isActive: data.isActive ?? true,
    subjectIds: data.subjectIds ?? [],
    selection: data.selection ?? null,
  });
  return response.data;
};

const runTestPreset = async (
  shelfId: string,
  testSuiteId: string,
): Promise<ApiResponse<TestRunCardRes[]>> => {
  const response = await apiClient.post(
    TEST_SUITE_ENDPOINTS.RUN(shelfId, testSuiteId),
  );
  return response.data;
};

const deleteTestSuite = async (
  shelfId: string,
  testSuiteId: string,
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete(
    TEST_SUITE_ENDPOINTS.BY_ID(shelfId, testSuiteId),
  );
  return response.data;
};

export {
  fetchTestSuitesByShelf,
  createTestSuite,
  runTestPreset,
  deleteTestSuite,
};
