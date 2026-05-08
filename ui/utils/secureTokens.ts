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

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const REFRESH_KEY = "oopsly_refresh_token_v1";

export async function saveRefreshTokenSecure(refreshToken: string): Promise<void> {
  if (Platform.OS === "web" || !refreshToken) return;
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function getRefreshTokenSecure(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function deleteRefreshTokenSecure(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {
    /* noop */
  }
}
