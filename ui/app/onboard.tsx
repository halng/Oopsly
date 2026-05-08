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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthService } from '@/services/AuthService';
import { useAuthStore } from '@/store';
import { Logger } from '@/utils';
import ScreenContainer from "@/components/common/ScreenContainer";
import ScreenHeader from "@/components/common/ScreenHeader";
import AppButton from "@/components/common/AppButton";
import FeedbackMessage from "@/components/common/FeedbackMessage";

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
    <ScreenContainer testID="email-input-screen">
      <ScreenHeader
        title="Email verification"
        subtitle="Secure sign in with one-time code"
        onBack={() => router.push("/")}
        testID="header-container"
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View className="flex-1 pt-6" testID="content-container">
        <Text className="text-3xl font-bold text-gray-900 mb-2" testID="title-text">
          What's your email?
        </Text>
        <Text className="text-base text-gray-500 mb-8" testID="description-text">
          We'll send you a secure code to verify your account.
        </Text>

        {/* Email Input */}
        <View className="mb-6" testID="email-input-container">
          <TextInput
            className={`w-full h-14 px-4 rounded-xl border-2 ${
              email ? (isEmailValid ? 'border-indigo-600' : 'border-red-500') 
              : 'border-gray-200'
            } text-gray-900 text-base`}
            placeholder="name@example.com"
            placeholderTextColor="#9CA3AF"
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
            <FeedbackMessage message={error} tone="error" testID="error-message" />
          ) : null}
        </View>
      </View>

      <View className="px-4 pb-8" testID="button-container">
        <AppButton
          label="Continue"
          onPress={handleContinue}
          disabled={!isEmailValid}
          loading={isLoading}
          accessibilityLabel="Continue button"
          testID="continue-button"
        />
      </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}