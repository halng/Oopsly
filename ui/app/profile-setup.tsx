/*
 * Copyright 2026 Hao Nguyen Tan
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import AuthScreenLayout from "@/components/common/AuthScreenLayout";
import AppButton from "@/components/common/AppButton";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { updateProfile } from "@/services/ProfileService";
import { uiTokens } from "@/constants/uiTokens";

const fieldStyle = { marginTop: 14, padding: 14, borderWidth: 1, borderColor: uiTokens.border.subtle, borderRadius: 12, color: uiTokens.text.primary } as const;

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const result = await updateProfile({ displayName: name.trim(), bio: bio.trim(), hobbies: hobbies.trim(), phone: contact.trim() || undefined });
      if (!result.isSuccess) throw new Error(result.message);
      router.replace("/home");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your profile"); }
    finally { setBusy(false); }
  };

  return <AuthScreenLayout testID="profile-setup-screen">
    <Text style={{ fontSize: 27, fontWeight: "700", color: uiTokens.text.primary }}>Tell us about yourself</Text>
    <Text style={{ marginTop: 8, color: uiTokens.text.muted }}>This information appears on your profile and can be changed later.</Text>
    <TextInput testID="profile-name" accessibilityLabel="Name" placeholder="Name" value={name} onChangeText={setName} style={fieldStyle} />
    <TextInput testID="profile-bio" accessibilityLabel="Bio" placeholder="A short bio" value={bio} onChangeText={setBio} multiline style={fieldStyle} />
    <TextInput testID="profile-hobbies" accessibilityLabel="Hobbies" placeholder="Hobbies (reading, languages, science...)" value={hobbies} onChangeText={setHobbies} style={fieldStyle} />
    <TextInput testID="profile-contact" accessibilityLabel="Other contact" placeholder="Phone (if you signed in with email)" value={contact} onChangeText={setContact} keyboardType="phone-pad" style={fieldStyle} />
    {error ? <FeedbackMessage testID="profile-setup-error" tone="error" message={error} /> : null}
    <View style={{ marginTop: 20 }}><AppButton testID="save-profile-button" label="Finish setup" onPress={save} disabled={!name.trim()} loading={busy} /></View>
  </AuthScreenLayout>;
}
