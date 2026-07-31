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

import React from "react";
import { Stack } from "expo-router";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 220,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen
        name="take-test/[testSuiteId]"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="[shelfId]/[action]/[id]"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
