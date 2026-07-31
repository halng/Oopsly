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

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  Edit3,
  Save,
  UserRound,
  BookOpen,
  Mail,
  X,
} from "lucide-react-native";
import { getProfile, updateProfile } from "@/services/ProfileService";
import { UserProfileRes } from "@/types/Profile";
import { useAuthStore } from "@/store/AuthStore";
import { Logger } from "@/utils";
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { uiTokens } from "@/constants/uiTokens";
import { MAX_READING_WIDTH } from "@/utils/responsiveLayout";

const logger = Logger.extend("ProfileScreen");

const inputStyle = {
  backgroundColor: uiTokens.surface.subtle,
  borderRadius: 12,
  padding: 16,
  color: uiTokens.text.primary,
  borderWidth: 1,
  borderColor: uiTokens.border.subtle,
  fontSize: 16,
} as const;

function FieldLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
    >
      {icon}
      <Text
        style={{ color: uiTokens.text.muted, fontSize: 14, marginLeft: 8 }}
      >
        {children}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const userEmail = useAuthStore((s) => s.userEmail);
  const [profile, setProfile] = useState<UserProfileRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
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

  const handleCancelEdit = () => {
    setDisplayName(profile?.displayName ?? "");
    setBio(profile?.bio ?? "");
    setIsEditing(false);
    setError(null);
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    updateProfile({
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      age: profile?.age ?? undefined,
    })
      .then((res) => {
        if (res.isSuccess && res.data) {
          setProfile(res.data);
          setDisplayName(res.data.displayName ?? "");
          setBio(res.data.bio ?? "");
          setIsEditing(false);
          setSuccess("Profile updated");
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
          <ActivityIndicator size="large" color={uiTokens.accent.default} />
          <Text style={{ color: uiTokens.text.muted, marginTop: 16 }}>
            Loading profile...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const completionScore = [
    displayName.trim(),
    bio.trim(),
    (userEmail ?? "").trim(),
  ].filter(Boolean).length;
  const completionPercent = Math.round((completionScore / 3) * 100);

  return (
    <ScreenContainer
      scrollable
      contentMaxWidth={MAX_READING_WIDTH}
      testID="profile-screen"
    >
      <ScreenHeader
        title="Profile"
        onBack={() => router.back()}
        testID="profile-header"
        rightSlot={
          !isEditing ? (
            <TouchableOpacity
              onPress={() => {
                setIsEditing(true);
                setSuccess(null);
              }}
              testID="edit-button"
            >
              <Edit3 size={20} color={uiTokens.accent.default} />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                onPress={handleCancelEdit}
                disabled={saving}
                testID="cancel-edit-button"
              >
                <X size={20} color={uiTokens.text.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !displayName.trim()}
                testID="save-button"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={uiTokens.accent.default} />
                ) : (
                  <Save size={20} color={uiTokens.accent.default} />
                )}
              </TouchableOpacity>
            </View>
          )
        }
      />
      <View className="py-6">
        {error && (
          <FeedbackMessage message={error} tone="error" testID="profile-error" />
        )}
        {success && (
          <FeedbackMessage
            message={success}
            tone="success"
            testID="profile-success"
          />
        )}

        <View
          style={{
            backgroundColor: uiTokens.accent.tint,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: uiTokens.border.subtle,
          }}
        >
          <Text
            style={{ color: uiTokens.accent.onTint, fontWeight: "600" }}
            testID="profile-completion-title"
          >
            Profile completeness: {completionPercent}%
          </Text>
          <View
            style={{
              marginTop: 8,
              height: 8,
              backgroundColor: uiTokens.surface.default,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                backgroundColor: uiTokens.accent.default,
                width: `${completionPercent}%`,
              }}
              testID="profile-completion-progress"
            />
          </View>
          <Text
            style={{ color: uiTokens.accent.onTint, fontSize: 12, marginTop: 8 }}
          >
            Add a display name and bio so others know what you are learning.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: uiTokens.surface.default,
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: uiTokens.border.subtle,
          }}
        >
          <FieldLabel icon={<Mail size={16} color={uiTokens.text.muted} />}>
            Email
          </FieldLabel>
          <Text
            style={{ fontSize: 16, color: uiTokens.text.secondary }}
            testID="profile-email"
          >
            {userEmail || "—"}
          </Text>

          <View style={{ marginTop: 24 }}>
            <FieldLabel icon={<UserRound size={16} color={uiTokens.text.muted} />}>
              Display name
            </FieldLabel>
            {isEditing ? (
              <TextInput
                style={inputStyle}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={uiTokens.text.muted}
                maxLength={50}
                testID="display-name-input"
              />
            ) : (
              <Text
                style={{ fontSize: 18, fontWeight: "500", color: uiTokens.text.primary }}
                testID="profile-display-name"
              >
                {profile?.displayName ?? "—"}
              </Text>
            )}
          </View>

          <View style={{ marginTop: 24 }}>
            <FieldLabel icon={<BookOpen size={16} color={uiTokens.text.muted} />}>
              Bio (learning focus)
            </FieldLabel>
            {isEditing ? (
              <TextInput
                style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us what you are learning (e.g. TOEIC, Java, SAT Math)"
                placeholderTextColor={uiTokens.text.muted}
                multiline
                numberOfLines={4}
                maxLength={200}
                testID="bio-input"
              />
            ) : (
              <Text
                style={{ fontSize: 16, color: uiTokens.text.secondary }}
                testID="profile-bio"
              >
                {profile?.bio ?? "—"}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: uiTokens.surface.default,
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: uiTokens.border.subtle,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onPress={() => router.push("/settings")}
          testID="profile-settings-link"
        >
          <Text style={{ color: uiTokens.text.primary, fontWeight: "500" }}>
            Settings
          </Text>
          <ChevronRight size={20} color={uiTokens.text.muted} />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
