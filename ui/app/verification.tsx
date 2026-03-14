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

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AuthService } from "@/services/AuthService";
import { useAuthStore } from "@/store";
import { ApiResponse } from "@/types/ApiRes";

export default function OTPVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(120); // 2 minutes in seconds
  const [isResendActive, setIsResendActive] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const userEmail = useAuthStore((state) => state.userEmail);

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
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
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
    if (e.nativeEvent.key === "Backspace" && !otp[index]) {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResend = () => {
    if (!isResendActive) return;

    AuthService.CreateOTP(userEmail)
      .then(() => {
        console.log("OTP resent successfully");
        setOtp(["", "", "", "", "", ""]);
        setTimer(120);
        setIsResendActive(false);

        // Restart timer
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
      })
      .catch((error) => {
        console.error("Error resending OTP:", error);
      });
  };

  const handleVerify = () => {
    AuthService.ValidateOTP(userEmail, otp.join(""))
      .then((response: ApiResponse) => {
        if (!response.isSuccess) {
          console.error("OTP verification failed:", response.message);
          return;
        }

        const { access_token, refresh_token } = response.data;
        useAuthStore.getState().setAuthTokens(access_token, refresh_token);
        router.push("/home");
      })
      .catch((error) => {
        console.error("Error verifying OTP:", error);
      });
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <View className="flex-1 bg-white" testID="verification-screen">
      {/* Header */}
      <View className="p-4 flex-row items-center" testID="header-container">
        <TouchableOpacity
          onPress={() => router.push("/onboard")}
          className="p-2"
          accessibilityLabel="Go back"
          testID="back-button"
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="px-6 pt-6" testID="content-container">
        <Text className="text-2xl font-bold text-gray-900" testID="title-text">
          Verify your email
        </Text>
        <Text className="mt-2 text-gray-600" testID="description-text">
          Enter the code sent to <Text style={{ fontWeight: 'bold' }} testID="user-email-display">{userEmail.split("@")[0]}</Text>
        </Text>

        {/* OTP Input Grid */}
        <View className="flex-row justify-between mt-8" testID="otp-input-container">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              className={`w-12 h-12 border-2 rounded-xl text-center text-xl
                ${digit ? "border-indigo-600" : "border-gray-300"}
                ${Platform.select({
                  ios: "leading-[46px]", // Center text vertically on iOS
                  android: "", // Android centers text automatically
                })}`}
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              accessibilityLabel={`OTP digit ${index + 1}`}
              testID={`otp-input-${index}`}
            />
          ))}
        </View>

        {/* Timer and Resend */}
        <View className="flex-row items-center justify-center mt-8 space-x-1" testID="timer-resend-container">
          <Text className="text-gray-600" testID="timer-text">{formatTime(timer)}</Text>
          <Text className="text-gray-600" testID="resend-label">I didn't receive code.</Text>
          <TouchableOpacity onPress={handleResend} disabled={!isResendActive} testID="resend-button">
            <Text
              className={`${
                isResendActive ? "text-indigo-600" : "text-gray-400"
              }`}
              testID="resend-button-text"
            >
              Resend
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 absolute bottom-8 w-full" testID="footer-container">
        <TouchableOpacity
          onPress={handleVerify}
          disabled={!isOtpComplete}
          className={`py-4 rounded-xl items-center
            ${isOtpComplete ? "bg-indigo-600" : "bg-gray-300"}`}
          accessibilityLabel="Verify and create account"
          testID="verify-button"
        >
          <Text className="text-white font-semibold" testID="verify-button-text">
            Verify & Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
