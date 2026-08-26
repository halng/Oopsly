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
import { ActivityIndicator, Text, View } from "react-native";
import { uiTokens } from "@/constants/uiTokens";
import PressableScale from "./PressableScale";

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

const variantBackgrounds: Record<Variant, string> = {
  primary: uiTokens.accent.default,
  secondary: uiTokens.surface.subtle,
  danger: uiTokens.state.error.solid,
};

const variantBackgroundsDisabled: Record<Variant, string> = {
  primary: uiTokens.accent.disabled,
  secondary: uiTokens.surface.subtle,
  danger: uiTokens.state.error.border,
};

const variantTextColors: Record<Variant, string> = {
  primary: uiTokens.text.onAccent,
  secondary: uiTokens.text.primary,
  danger: uiTokens.text.onAccent,
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
  const background = isDisabled
    ? variantBackgroundsDisabled[variant]
    : variantBackgrounds[variant];
  const textColor = variantTextColors[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      pressedScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={{
        backgroundColor: background,
        borderRadius: 14,
        minHeight: 52,
        opacity: isDisabled ? 0.85 : 1,
      }}
    >
      <View className="py-4 items-center justify-center">
        {loading ? (
          <ActivityIndicator
            color={textColor}
            testID={testID ? `${testID}-loading` : undefined}
          />
        ) : (
          <Text
            style={{ color: textColor, fontWeight: "600", fontSize: 16 }}
            testID={testID ? `${testID}-text` : undefined}
          >
            {label}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}
