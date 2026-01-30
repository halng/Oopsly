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

import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import "react-native-reanimated";
import "@/global.css";
import { useAuthStore } from "@/store";
import { Logger } from "@/utils";
const logger = Logger.extend("RootLayout");

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  // const [isReady, setIsReady] = useState(false);
  // const hydrated = useAuthStore.persist.hasHydrated();
  const isAuthenticated = useAuthStore(((state) => state.isAuthenticated));
  logger.debug("RootLayout rendered");

  // useEffect(() => {
  //   logger.debug("Checking auth store hydration status...");
  //   const unsub = useAuthStore.persist.onFinishHydration(() => {
  //     setIsReady(true);
  //     logger.debug("Auth store hydrated. isAuthenticated:", isAuthenticated);
  //   });

  //   if (hydrated) {
  //     setIsReady(true);
  //     logger.debug("Auth store hydrated. isAuthenticated:", isAuthenticated);
  //   }

  //   return () => unsub();
  // }, [hydrated]);

  //TODO: add theme provider when themes are ready
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(user)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="index" />
    </Stack>
  );
}
