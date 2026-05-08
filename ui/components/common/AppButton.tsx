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

import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

type Variant = "primary" | "secondary" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  testID?: string;
  accessibilityLabel?: string;
};

const variantStyles: Record<Variant, string> = {
  primary: "bg-indigo-600",
  secondary: "bg-gray-200",
  danger: "bg-red-500",
};

const variantTextStyles: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-gray-800",
  danger: "text-white",
};

export default function AppButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  testID,
  accessibilityLabel,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-xl py-4 items-center justify-center ${
        variantStyles[variant]
      } ${isDisabled ? "opacity-60" : "opacity-100"}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "secondary" ? "#111827" : "#FFFFFF"}
          testID={testID ? `${testID}-loading` : undefined}
        />
      ) : (
        <Text className={`font-semibold text-base ${variantTextStyles[variant]}`}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
