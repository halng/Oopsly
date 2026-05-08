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

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AuthService } from "@/services/AuthService";
import { useAuthStore } from "@/store";
import { ApiResponse } from "@/types/ApiRes";

export default function OTPVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const [isResendActive, setIsResendActive] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userEmail = useAuthStore((state) => state.userEmail);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    setTimer(120);
    setIsResendActive(false);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsResendActive(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    inputRefs.current[0]?.focus();
    startTimer();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleOtpChange = (text: string, index: number) => {
    setVerifyError(null);
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index]) {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleResend = async () => {
    if (!isResendActive || resendBusy || !userEmail) return;
    setResendBusy(true);
    setVerifyError(null);
    try {
      await AuthService.CreateOTP(userEmail);
      setOtp(["", "", "", "", "", ""]);
      startTimer();
      inputRefs.current[0]?.focus();
    } catch {
      setVerifyError("Could not resend code. Try again.");
    } finally {
      setResendBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!userEmail) {
      setVerifyError("Missing email. Go back and enter your email.");
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const response: ApiResponse = await AuthService.ValidateOTP(
        userEmail,
        otp.join(""),
      );
      if (!response.isSuccess) {
        setVerifyError(
          response.message || "Invalid or expired code. Try again.",
        );
        return;
      }
      const { access_token, refresh_token } = response.data;
      useAuthStore
        .getState()
        .setCredentials(userEmail, access_token, refresh_token);
      router.replace("/home");
    } catch {
      setVerifyError("Something went wrong. Check your connection.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <View className="flex-1 bg-white" testID="verification-screen">
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

      <View className="px-6 pt-6" testID="content-container">
        <Text className="text-2xl font-bold text-gray-900" testID="title-text">
          Verify your email
        </Text>
        <Text className="mt-2 text-gray-600" testID="description-text">
          Enter the code sent to{" "}
          <Text className="font-semibold text-gray-900" testID="user-email-display">
            {userEmail || "your inbox"}
          </Text>
        </Text>

        <View
          className="flex-row justify-between mt-8"
          testID="otp-input-container"
        >
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              className={`w-12 h-12 border-2 rounded-xl text-center text-xl
                ${digit ? "border-indigo-600" : "border-gray-300"}
                ${Platform.select({
                  ios: "leading-[46px]",
                  android: "",
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

        {verifyError ? (
          <Text className="text-red-600 mt-4" testID="verify-error-message">
            {verifyError}
          </Text>
        ) : null}

        <View
          className="flex-row items-center justify-center mt-8 gap-1 flex-wrap"
          testID="timer-resend-container"
        >
          <Text className="text-gray-600" testID="timer-text">
            {formatTime(timer)}
          </Text>
          <Text className="text-gray-600" testID="resend-label">
            {" "}
            I did not receive a code.
          </Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={!isResendActive || resendBusy}
            testID="resend-button"
          >
            <Text
              className={`${
                isResendActive && !resendBusy
                  ? "text-indigo-600"
                  : "text-gray-400"
              }`}
              testID="resend-button-text"
            >
              {resendBusy ? "Sending…" : "Resend"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 absolute bottom-8 w-full" testID="footer-container">
        <TouchableOpacity
          onPress={handleVerify}
          disabled={!isOtpComplete || verifyLoading}
          className={`py-4 rounded-xl items-center flex-row justify-center gap-2
            ${isOtpComplete && !verifyLoading ? "bg-indigo-600" : "bg-gray-300"}`}
          accessibilityLabel="Verify and sign in"
          testID="verify-button"
        >
          {verifyLoading ? (
            <ActivityIndicator color="#FFFFFF" testID="verify-loading" />
          ) : (
            <Text className="text-white font-semibold" testID="verify-button-text">
              Verify and continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
