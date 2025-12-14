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

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function OTPVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(120); // 2 minutes in seconds
  const [isResendActive, setIsResendActive] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  // Mock email - in real app, this would come from navigation params or state
  const userEmail = "user@example.com";

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();

    // Timer countdown
    const timerInterval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsResendActive(true);
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (text: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance to next input
    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index]) {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResend = () => {
    if (!isResendActive) return;
    
    // Reset timer and resend state
    setTimer(120);
    setIsResendActive(false);
    
    // Mock resend API call
    console.log('Resending OTP...');
  };

  const handleVerify = () => {
    // Mock verification
    console.log('Verifying OTP:', otp.join(''));
    // Navigate to next screen or handle verification logic
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="p-4 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="px-6 pt-6">
        <Text className="text-2xl font-bold text-gray-900">
          Verify your email
        </Text>
        <Text className="mt-2 text-gray-600">
          Enter the code sent to {userEmail}
        </Text>

        {/* OTP Input Grid */}
        <View className="flex-row justify-between mt-8">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => inputRefs.current[index] = ref}
              className={`w-12 h-12 border-2 rounded-xl text-center text-xl
                ${digit ? 'border-indigo-600' : 'border-gray-300'}
                ${Platform.select({
                  ios: 'leading-[46px]', // Center text vertically on iOS
                  android: '' // Android centers text automatically
                })}`}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              accessibilityLabel={`OTP digit ${index + 1}`}
            />
          ))}
        </View>

        {/* Timer and Resend */}
        <View className="flex-row items-center justify-center mt-8 space-x-1">
          <Text className="text-gray-600">{formatTime(timer)}</Text>
          <Text className="text-gray-600">I didn't receive code.</Text>
          <TouchableOpacity 
            onPress={handleResend}
            disabled={!isResendActive}
          >
            <Text className={`${isResendActive ? 'text-indigo-600' : 'text-gray-400'}`}>
              Resend
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 absolute bottom-8 w-full">
        <TouchableOpacity
          onPress={handleVerify}
          disabled={!isOtpComplete}
          className={`py-4 rounded-xl items-center
            ${isOtpComplete ? 'bg-indigo-600' : 'bg-gray-300'}`}
          accessibilityLabel="Verify and create account"
        >
          <Text className="text-white font-semibold">
            Verify & Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}