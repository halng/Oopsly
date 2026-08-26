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

import AppButton from "@/components/common/AppButton";
import AuthScreenLayout from "@/components/common/AuthScreenLayout";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { MESSAGES } from "@/constants/message";
import { METADATA } from "@/constants/metadata";
import { uiTokens } from "@/constants/uiTokens";
import { useAsyncState } from "@/hooks/use-async-state";
import { sendEmailLink } from "@/services/FirebaseAuthService";
import { isEmail } from "@/utils";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [value, setValue] = useState("");
  const {
    isLoading,
    error,
    isSuccess,
    handleStart,
    handleSuccess,
    handleError,
  } = useAsyncState("LoginScreen");

  const sendCode = async () => {
    handleStart();
    const identifier = value.trim();

    if (isEmail(identifier)) {
      sendEmailLink(identifier)
        .then(() => {
          handleSuccess();
        })
        .catch((err) => {
          handleError(err.message, MESSAGES.LOGIN.GENERIC_ERROR);
        });
    }
  };

  const renderLoginForm = () => {
    return (
      <>
        <TextInput
          testID="login-identifier"
          value={value}
          onChangeText={setValue}
          autoCapitalize="none"
          placeholder={METADATA.LOGIN.SIGN_IN_LOGIN_IDENTIFIER_PLACEHOLDER}
          style={{
            marginTop: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: uiTokens.border.subtle,
            borderRadius: 12,
          }}
        />

        {error ? (
          <FeedbackMessage testID="login-error" tone="error" message={error} />
        ) : null}

        <View style={{ marginTop: 20 }}>
          <AppButton
            testID="send-otp-button"
            label={METADATA.LOGIN.SIGN_IN_BUTTON}
            onPress={sendCode}
            disabled={!value.trim()}
            loading={isLoading}
          />
        </View>
      </>
    );
  };

  // TODO: Make this transition to a modal and check mark animation
  const renderSuccessMessage = () => {
    return (
      <FeedbackMessage
        testID="login-success"
        tone="success"
        message={METADATA.LOGIN.SIGN_IN_WITH_EMAIL_LINK_SUCCESS}
      />
    );
  };

  return (
    <AuthScreenLayout testID="login-screen">
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: uiTokens.text.primary,
        }}
      >
        {METADATA.LOGIN.SIGN_IN_TITLE}
      </Text>
      <Text style={{ marginTop: 8, color: uiTokens.text.muted }}>
        {METADATA.LOGIN.SIGN_IN_SUBTITLE}
      </Text>

      {isSuccess ? renderSuccessMessage() : renderLoginForm()}
    </AuthScreenLayout>
  );
}
