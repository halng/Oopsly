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

import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import AuthScreenLayout from "@/components/common/AuthScreenLayout";
import AppButton from "@/components/common/AppButton";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { uiTokens } from "@/constants/uiTokens";
import { FirebaseAuthService } from "@/services/FirebaseAuthService";
import { AUTH_METHOD_EMAIL, AUTH_METHOD_PHONE } from "@/constants/auth";
import { APP_ROUTES } from "@/constants/routes";

export default function LoginScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">(AUTH_METHOD_EMAIL);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const identifier = value.trim();
    setBusy(true);
    setError(null);

    try {
      if (method === AUTH_METHOD_EMAIL) {
        await FirebaseAuthService.sendEmailLink(identifier);
        router.push({ pathname: APP_ROUTES.verification, params: { method, identifier } });
      } else {
        const { sessionInfo } = await FirebaseAuthService.startPhoneVerification(identifier);
        router.push({
          pathname: APP_ROUTES.verification,
          params: { method, identifier, sessionInfo },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreenLayout testID="login-screen">
      <Text style={{ fontSize: 28, fontWeight: "700", color: uiTokens.text.primary }}>
        Sign in to Oopsly
      </Text>
      <Text style={{ marginTop: 8, color: uiTokens.text.muted }}>
        Use a one-time link or phone code. No password needed.
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 24 }}>
        {[AUTH_METHOD_EMAIL, AUTH_METHOD_PHONE].map((option) => (
          <TouchableOpacity
            key={option}
            testID={`login-method-${option}`}
            onPress={() => {
              setMethod(option);
              setValue("");
            }}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor:
                method === option ? uiTokens.accent.tint : uiTokens.surface.subtle,
            }}
          >
            <Text>{option === AUTH_METHOD_EMAIL ? "Email" : "Phone"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        testID="login-identifier"
        accessibilityLabel={method}
        value={value}
        onChangeText={setValue}
        autoCapitalize="none"
        keyboardType={method === AUTH_METHOD_EMAIL ? "email-address" : "phone-pad"}
        placeholder={method === AUTH_METHOD_EMAIL ? "name@example.com" : "+1 555 123 4567"}
        style={{
          marginTop: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: uiTokens.border.subtle,
          borderRadius: 12,
        }}
      />

      {error ? <FeedbackMessage testID="login-error" tone="error" message={error} /> : null}

      <View style={{ marginTop: 20 }}>
        <AppButton
          testID="send-otp-button"
          label={method === AUTH_METHOD_EMAIL ? "Send sign-in link" : "Continue with phone"}
          onPress={sendCode}
          disabled={!value.trim()}
          loading={busy}
        />
      </View>
    </AuthScreenLayout>
  );
}
