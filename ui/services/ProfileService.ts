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
  UserProfileRes,
  UpdateProfileReq,
  UpdateSettingsReq,
} from "@/types/Profile";
import { apiClient } from ".";

const PROFILE_ENDPOINTS = {
  PROFILE: "/user/profile",
  SETTINGS: "/user/settings",
};

const getProfile = async (): Promise<ApiResponse<UserProfileRes>> => {
  const response = await apiClient.get(PROFILE_ENDPOINTS.PROFILE);
  return response.data;
};

const updateProfile = async (
  data: UpdateProfileReq,
): Promise<ApiResponse<UserProfileRes>> => {
  const response = await apiClient.patch(PROFILE_ENDPOINTS.PROFILE, data);
  return response.data;
};

const updateSettings = async (
  data: UpdateSettingsReq,
): Promise<ApiResponse<UserProfileRes>> => {
  const response = await apiClient.patch(PROFILE_ENDPOINTS.SETTINGS, data);
  return response.data;
};

export { getProfile, updateProfile, updateSettings };
