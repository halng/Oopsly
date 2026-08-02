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

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { useAuthStore } from '@/store';
import { Logger } from '@/utils';
import AuthScreenLayout from "@/components/common/AuthScreenLayout";
import AppButton from "@/components/common/AppButton";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import { uiTokens } from "@/constants/uiTokens";

export default function EmailInputScreen() {
  const logger = Logger.extend('EmailInputScreen');
  logger.debug('Rendering EmailInputScreen component');
  
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const authState = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Basic email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = useCallback(async () => {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    };
    
    setIsLoading(true);
    AuthService.CreateOTP(email)
      .then((res) => {
        if (res.isSuccess) {
          logger.info("OTP sent successfully");
          authState.setUserEmail(email);
          setIsLoading(false);
          router.push("/verification");
          return;
        }
        setError(res.message || "Could not send code. Try again.");
        setIsLoading(false);
      })
      .catch((error) => {
        setError('Failed to send OTP. Please try again.');
        setIsLoading(false);
        logger.error('Error sending OTP:', error);
      })
    
  }, [email, router, authState]);

  const isEmailValid = isValidEmail(email);

  return (
    <AuthScreenLayout testID="email-input-screen">
      <Text
        style={{ color: uiTokens.text.primary, fontSize: 28, fontWeight: "700", marginBottom: 8 }}
        testID="title-text"
      >
        What's your email?
      </Text>
      <Text
        style={{ color: uiTokens.text.muted, fontSize: 16, marginBottom: 32 }}
        testID="description-text"
      >
        We'll send you a secure code to verify your account.
      </Text>

      <View className="mb-6" testID="email-input-container">
        <TextInput
          style={{
            width: "100%",
            height: 56,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: email
              ? isEmailValid
                ? uiTokens.accent.default
                : uiTokens.state.error.solid
              : uiTokens.border.subtle,
            color: uiTokens.text.primary,
            fontSize: 16,
            backgroundColor: uiTokens.surface.default,
          }}
          placeholder="name@example.com"
          placeholderTextColor={uiTokens.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email input field"
          accessibilityHint="Enter your email address"
          testID="email-input"
        />
        {error ? (
          <View style={{ marginTop: 12 }}>
            <FeedbackMessage message={error} tone="error" testID="error-message" />
          </View>
        ) : null}
      </View>

      <View testID="button-container">
        <AppButton
          label="Continue"
          onPress={handleContinue}
          disabled={!isEmailValid}
          loading={isLoading}
          accessibilityLabel="Continue button"
          testID="continue-button"
        />
      </View>
    </AuthScreenLayout>
  );
}
