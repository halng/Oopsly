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
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Edit3, Save, X } from "lucide-react-native";
import { getProfile, updateProfile } from "@/services/ProfileService";
import { UserProfileRes } from "@/types/Profile";
import { Logger } from "@/utils";

const logger = Logger.extend("ProfileScreen");

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    setError(null);
    getProfile()
      .then((res) => {
        if (res.isSuccess && res.data) {
          setProfile(res.data);
          setDisplayName(res.data.displayName ?? "");
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
      return;
    }
    setSaving(true);
    updateProfile({
      displayName: displayName.trim(),
      bio: profile?.bio ?? undefined,
      age: profile?.age ?? undefined,
    })
      .then((res) => {
        if (res.isSuccess && res.data) {
          setProfile(res.data);
          setDisplayName(res.data.displayName ?? "");
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
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-600 mt-4">Loading profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#4F46E5" />
            <Text className="text-indigo-600 font-medium ml-1">Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Profile</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Edit3 size={20} color="#4F46E5" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !displayName.trim()}
            >
              <Save size={20} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-red-700">{error}</Text>
          </View>
        )}

        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-gray-500 text-sm mb-1">Display name</Text>
          {isEditing ? (
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#9CA3AF"
              maxLength={50}
            />
          ) : (
            <Text className="text-lg font-medium text-gray-800">
              {profile?.displayName ?? "—"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-white rounded-xl p-4 mt-4 shadow-sm flex-row items-center justify-between"
          onPress={() => router.push("/settings")}
        >
          <Text className="text-gray-800 font-medium">Settings</Text>
          <ChevronLeft size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
