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

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, CalendarClock, Palette } from "lucide-react-native";
import { useSettingsStore, ThemeMode } from "@/store/SettingsStore";
import { getProfile, updateSettings } from "@/services/ProfileService";
import {
  DEFAULT_STUDY_SCHEDULE,
  SettingsRes,
  StudySchedule,
} from "@/types/Profile";
import { Logger } from "@/utils";
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import FeedbackMessage from "@/components/common/FeedbackMessage";
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

const WEEKDAY_OPTIONS: { day: number; label: string }[] = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [remoteSettings, setRemoteSettings] = useState<SettingsRes | null>(null);
  const [studySchedule, setStudySchedule] = useState<StudySchedule>(
    DEFAULT_STUDY_SCHEDULE,
  );

  const loadSettings = useCallback(() => {
    setLoading(true);
    setError(null);
    getProfile()
      .then((res) => {
        if (res.isSuccess && res.data?.settings) {
          setRemoteSettings(res.data.settings);
          setStudySchedule(
            res.data.settings.studySchedule ?? DEFAULT_STUDY_SCHEDULE,
          );
        } else {
          setError(res.message ?? "Failed to load settings");
        }
      })
      .catch((err) => {
        logger.error("Error loading settings:", err);
        setError(err?.message ?? "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const syncSettings = async (
    nextTheme: string,
    nextSchedule: StudySchedule,
  ) => {
    const language = remoteSettings?.language ?? "ENGLISH";
    const spaceConfig = remoteSettings?.spaceConfig ?? DEFAULT_SPACE_CONFIG;
    const res = await updateSettings({
      theme: nextTheme,
      language,
      spaceConfig,
      studySchedule: nextSchedule,
    });
    if (res.isSuccess && res.data?.settings) {
      setRemoteSettings(res.data.settings);
      setStudySchedule(
        res.data.settings.studySchedule ?? nextSchedule,
      );
    }
    return res;
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setError(null);
    syncSettings(newTheme.toUpperCase(), studySchedule)
      .then(() => logger.debug("Theme synced to server"))
      .catch((err) => {
        logger.debug("Optional sync failed:", err);
        setError(err?.message ?? "Failed to sync theme");
      });
  };

  const toggleStudyDay = (day: number) => {
    setStudySchedule((prev) => {
      const hasDay = prev.studyDays.includes(day);
      const studyDays = hasDay
        ? prev.studyDays.filter((d) => d !== day)
        : [...prev.studyDays, day].sort((a, b) => a - b);
      return { ...prev, studyDays };
    });
    setSuccess(null);
  };

  const handleSaveSchedule = () => {
    if (!TIME_PATTERN.test(studySchedule.preferredStudyTime.trim())) {
      setError("Study time must be HH:mm (24-hour), e.g. 09:00");
      return;
    }
    setSavingSchedule(true);
    setError(null);
    setSuccess(null);
    const payload: StudySchedule = {
      preferredStudyTime: studySchedule.preferredStudyTime.trim(),
      studyDays: studySchedule.studyDays,
      reminderEnabled: studySchedule.reminderEnabled,
    };
    syncSettings(theme.toUpperCase(), payload)
      .then((res) => {
        if (res.isSuccess) {
          setSuccess("Study schedule saved");
        } else {
          setError(res.message ?? "Failed to save schedule");
        }
      })
      .catch((err) => {
        logger.error("Error saving schedule:", err);
        setError(err?.message ?? "Failed to save schedule");
      })
      .finally(() => setSavingSchedule(false));
  };

  if (loading) {
    return (
      <ScreenContainer testID="settings-loading-screen">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={uiTokens.accent.default} />
          <Text style={{ color: uiTokens.text.muted, marginTop: 16 }}>
            Loading settings...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      scrollable
      contentMaxWidth={MAX_READING_WIDTH}
      testID="settings-screen"
    >
      <ScreenHeader
        title="Settings"
        subtitle="Theme and study schedule"
        onBack={() => router.back()}
        testID="settings-header"
      />
      <View className="py-6">
        {error && (
          <FeedbackMessage message={error} tone="error" testID="settings-error" />
        )}
        {success && (
          <FeedbackMessage
            message={success}
            tone="success"
            testID="settings-success"
          />
        )}

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

        <View className="mb-6" testID="study-schedule-section">
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: uiTokens.text.secondary,
              marginBottom: 12,
            }}
          >
            Study schedule
          </Text>
          <View
            style={{
              backgroundColor: uiTokens.surface.default,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: uiTokens.border.subtle,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <CalendarClock size={20} color={uiTokens.accent.default} />
              <Text
                style={{
                  color: uiTokens.text.primary,
                  fontWeight: "500",
                  marginLeft: 12,
                }}
              >
                Preferred time (HH:mm)
              </Text>
            </View>
            <TextInput
              value={studySchedule.preferredStudyTime}
              onChangeText={(text) => {
                setStudySchedule((prev) => ({
                  ...prev,
                  preferredStudyTime: text,
                }));
                setSuccess(null);
              }}
              placeholder="09:00"
              placeholderTextColor={uiTokens.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={5}
              testID="study-time-input"
              style={{
                backgroundColor: uiTokens.surface.subtle,
                borderRadius: 12,
                padding: 14,
                color: uiTokens.text.primary,
                borderWidth: 1,
                borderColor: uiTokens.border.subtle,
                fontSize: 16,
                marginBottom: 16,
              }}
            />

            <Text
              style={{
                color: uiTokens.text.muted,
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Study days
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
              testID="study-days-row"
            >
              {WEEKDAY_OPTIONS.map((opt) => {
                const selected = studySchedule.studyDays.includes(opt.day);
                return (
                  <TouchableOpacity
                    key={opt.day}
                    onPress={() => toggleStudyDay(opt.day)}
                    testID={`study-day-${opt.day}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{
                      minWidth: 44,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: selected
                        ? uiTokens.accent.default
                        : uiTokens.border.subtle,
                      backgroundColor: selected
                        ? uiTokens.accent.tint
                        : uiTokens.surface.subtle,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selected
                          ? uiTokens.accent.onTint
                          : uiTokens.text.primary,
                        fontWeight: selected ? "700" : "500",
                        fontSize: 13,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Bell size={20} color={uiTokens.accent.default} />
                <Text
                  style={{
                    color: uiTokens.text.primary,
                    fontWeight: "500",
                    marginLeft: 12,
                  }}
                >
                  Reminder preference
                </Text>
              </View>
              <Switch
                value={studySchedule.reminderEnabled}
                onValueChange={(value) => {
                  setStudySchedule((prev) => ({
                    ...prev,
                    reminderEnabled: value,
                  }));
                  setSuccess(null);
                }}
                testID="reminder-toggle"
                trackColor={{
                  false: uiTokens.border.strong,
                  true: uiTokens.accent.disabled,
                }}
                thumbColor={
                  studySchedule.reminderEnabled
                    ? uiTokens.accent.default
                    : uiTokens.surface.default
                }
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveSchedule}
              disabled={savingSchedule}
              testID="save-schedule-button"
              style={{
                backgroundColor: savingSchedule
                  ? uiTokens.accent.disabled
                  : uiTokens.accent.default,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {savingSchedule ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: uiTokens.text.onAccent,
                    fontWeight: "700",
                    fontSize: 15,
                  }}
                >
                  Save schedule
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
