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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Edit3, Save, UserRound, BookOpen, Calendar } from "lucide-react-native";
import { getProfile, updateProfile } from "@/services/ProfileService";
import { UserProfileRes } from "@/types/Profile";
import { Logger } from "@/utils";
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import FeedbackMessage from "@/components/common/FeedbackMessage";

const logger = Logger.extend("ProfileScreen");

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    setError(null);
    getProfile()
      .then((res) => {
        if (res.isSuccess && res.data) {
          setProfile(res.data);
          setDisplayName(res.data.displayName ?? "");
          setBio(res.data.bio ?? "");
          setAgeInput(res.data.age ? String(res.data.age) : "");
        } else {
          setError(res.message ?? "Failed to load profile");
        }
      })
      .catch((err) => {
        logger.error("Error loading profile:", err);
        setError(err?.message ?? "Failed to load profile");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    const parsedAge = ageInput.trim() ? Number(ageInput.trim()) : undefined;
    if (parsedAge !== undefined && (Number.isNaN(parsedAge) || parsedAge < 5 || parsedAge > 120)) {
      setError("Age must be a number between 5 and 120.");
      return;
    }
    setSaving(true);
    setError(null);
    updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      age: parsedAge,
    })
      .then((res) => {
        if (res.isSuccess && res.data) {
          setProfile(res.data);
          setDisplayName(res.data.displayName ?? "");
          setBio(res.data.bio ?? "");
          setAgeInput(res.data.age ? String(res.data.age) : "");
          setIsEditing(false);
        } else {
          setError(res.message ?? "Failed to update profile");
        }
      })
      .catch((err) => {
        logger.error("Error updating profile:", err);
        setError(err?.message ?? "Failed to update profile");
      })
      .finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <ScreenContainer testID="profile-loading-screen">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-600 mt-4">Loading profile...</Text>
      </View>
      </ScreenContainer>
    );
  }

  const completionScore = [displayName.trim(), bio.trim(), ageInput.trim()].filter(
    Boolean,
  ).length;
  const completionPercent = Math.round((completionScore / 3) * 100);

  return (
    <ScreenContainer scrollable testID="profile-screen">
      <ScreenHeader
        title="Profile"
        onBack={() => router.back()}
        testID="profile-header"
        rightSlot={
          !isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)} testID="edit-button">
              <Edit3 size={20} color="#4F46E5" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !displayName.trim()}
              testID="save-button"
            >
              <Save size={20} color="#4F46E5" />
            </TouchableOpacity>
          )
        }
      />
      <View className="py-6">
        {error && (
          <FeedbackMessage message={error} tone="error" testID="profile-error" />
        )}

        <View className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-100">
          <Text className="text-indigo-700 font-semibold" testID="profile-completion-title">
            Profile completeness: {completionPercent}%
          </Text>
          <View className="mt-2 h-2 bg-indigo-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-indigo-600"
              style={{ width: `${completionPercent}%` }}
              testID="profile-completion-progress"
            />
          </View>
          <Text className="text-indigo-700 text-xs mt-2">
            Completing profile helps personalize study pacing and reminders.
          </Text>
        </View>

        <View className="bg-white rounded-xl p-6 shadow-sm">
          <View className="flex-row items-center mb-2">
            <UserRound size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-2">Display name</Text>
          </View>
          {isEditing ? (
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
              testID="display-name-input"
            />
          ) : (
            <Text className="text-lg font-medium text-gray-800">
              {profile?.displayName ?? "—"}
            </Text>
          )}

          <View className="flex-row items-center mt-6 mb-2">
            <BookOpen size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-2">Bio (learning focus)</Text>
          </View>
          {isEditing ? (
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us what you are learning (e.g. TOEIC, Java, SAT Math)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
              testID="bio-input"
            />
          ) : (
            <Text className="text-base text-gray-700">{profile?.bio ?? "—"}</Text>
          )}

          <View className="flex-row items-center mt-6 mb-2">
            <Calendar size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-2">Age</Text>
          </View>
          {isEditing ? (
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              value={ageInput}
              onChangeText={(value) => setAgeInput(value.replace(/[^\d]/g, ""))}
              placeholder="Enter your age"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={3}
              testID="age-input"
            />
          ) : (
            <Text className="text-base text-gray-700">{profile?.age ?? "—"}</Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-white rounded-xl p-4 mt-4 shadow-sm flex-row items-center justify-between"
          onPress={() => router.push("/settings")}
          testID="profile-settings-link"
        >
          <Text className="text-gray-800 font-medium">Settings</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
