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
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { otpService } from '../services/otp';
import { useAuthStore } from '../store/AuthStore';

export default function EmailInputScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const setUserEmail = useAuthStore((state) => state.setUserEmail);

  // Basic email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = useCallback(async () => {
    if (!isValidEmail(email)) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await otpService.sendOTP(email);
      setUserEmail(email);
      router.push('/verification');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  }, [email, router, setUserEmail]);

  const isEmailValid = isValidEmail(email);

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-12 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 px-4">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          What's your email?
        </Text>
        <Text className="text-base text-gray-500 mb-8">
          We'll send you a secure code to verify your account.
        </Text>

        {/* Email Input */}
        <View className="mb-6">
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
          />
        </View>

        {/* Error Message */}
        {error ? (
          <Text className="text-red-500 text-sm mb-4">{error}</Text>
        ) : null}
      </View>

      {/* Bottom Button */}
      <View className="px-4 pb-8">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isEmailValid || isLoading}
          className={`w-full h-14 rounded-xl justify-center items-center bg-indigo-600 
            ${(!isEmailValid || isLoading) ? 'opacity-50' : 'opacity-100'}`}
          accessibilityLabel="Continue button"
          accessibilityHint="Proceed to verification"
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}