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

import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Palette } from "lucide-react-native";
import { useSettingsStore, ThemeMode } from "@/store/SettingsStore";
import { getProfile, updateSettings } from "@/services/ProfileService";
import { Logger } from "@/utils";

const logger = Logger.extend("SettingsScreen");

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

const DEFAULT_SPACE_CONFIG = {
  AGAIN: 1,
  HARD: 1,
  GOOD: 5,
  EASY: 10,
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    getProfile()
      .then((res) => {
        if (res.isSuccess && res.data?.settings) {
          const settings = res.data.settings;
          return updateSettings({
            theme: newTheme.toUpperCase(),
            language: settings.language ?? "ENGLISH",
            spaceConfig: settings.spaceConfig ?? DEFAULT_SPACE_CONFIG,
          });
        }
      })
      .then(() => logger.debug("Settings synced to server"))
      .catch((err) => logger.debug("Optional sync failed:", err));
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4F46E5" />
            <Text className="text-indigo-600 font-medium ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800 ml-4">Settings</Text>
        </View>
        <Text className="text-gray-500 mt-1">Theme and preferences</Text>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-700 mb-3">
            Appearance
          </Text>
          <View className="bg-white rounded-xl shadow-sm overflow-hidden">
            <View className="flex-row items-center p-4 border-b border-gray-100">
              <Palette size={20} color="#4F46E5" />
              <Text className="text-gray-800 font-medium ml-3">Theme</Text>
            </View>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                className={`flex-row items-center justify-between p-4 ${
                  opt.id !== "system" ? "border-b border-gray-100" : ""
                } ${theme === opt.id ? "bg-indigo-50" : ""}`}
                onPress={() => handleThemeChange(opt.id)}
              >
                <Text
                  className={
                    theme === opt.id
                      ? "text-indigo-600 font-medium"
                      : "text-gray-800"
                  }
                >
                  {opt.label}
                </Text>
                {theme === opt.id && (
                  <View className="w-5 h-5 rounded-full bg-indigo-500" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
