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

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Palette } from "lucide-react-native";
import { useSettingsStore, ThemeMode } from "@/store/SettingsStore";
import { getProfile, updateSettings } from "@/services/ProfileService";
import { Logger } from "@/utils";
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import { uiTokens } from "@/constants/uiTokens";
import { MAX_READING_WIDTH } from "@/utils/responsiveLayout";

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
    <ScreenContainer
      scrollable
      contentMaxWidth={MAX_READING_WIDTH}
      testID="settings-screen"
    >
      <ScreenHeader
        title="Settings"
        subtitle="Theme and preferences"
        onBack={() => router.back()}
        testID="settings-header"
      />
      <View className="py-6">
        <View className="mb-6">
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: uiTokens.text.secondary,
              marginBottom: 12,
            }}
          >
            Appearance
          </Text>
          <View
            style={{
              backgroundColor: uiTokens.surface.default,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: uiTokens.border.subtle,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: uiTokens.border.subtle,
              }}
            >
              <Palette size={20} color={uiTokens.accent.default} />
              <Text
                style={{
                  color: uiTokens.text.primary,
                  fontWeight: "500",
                  marginLeft: 12,
                }}
              >
                Theme
              </Text>
            </View>
            {THEME_OPTIONS.map((opt, idx) => {
              const isSelected = theme === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 16,
                    borderBottomWidth: idx !== THEME_OPTIONS.length - 1 ? 1 : 0,
                    borderBottomColor: uiTokens.border.subtle,
                    backgroundColor: isSelected
                      ? uiTokens.accent.tint
                      : "transparent",
                  }}
                  onPress={() => handleThemeChange(opt.id)}
                  testID={`theme-option-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? uiTokens.accent.onTint
                        : uiTokens.text.primary,
                      fontWeight: isSelected ? "600" : "500",
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        backgroundColor: uiTokens.accent.default,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
