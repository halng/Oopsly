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
import { Text, View } from "react-native";
import { uiTokens } from "@/constants/uiTokens";

type Tone = "error" | "info" | "success" | "warning";

type Props = {
  message: string;
  tone?: Tone;
  testID?: string;
};

const tonePalette: Record<Tone, { bg: string; border: string; text: string }> = {
  error: {
    bg: uiTokens.state.error.bg,
    border: uiTokens.state.error.border,
    text: uiTokens.state.error.text,
  },
  info: {
    bg: uiTokens.state.info.bg,
    border: uiTokens.state.info.border,
    text: uiTokens.state.info.text,
  },
  success: {
    bg: uiTokens.state.success.bg,
    border: uiTokens.state.success.border,
    text: uiTokens.state.success.text,
  },
  warning: {
    bg: uiTokens.state.warning.bg,
    border: uiTokens.state.warning.border,
    text: uiTokens.state.warning.text,
  },
};

export default function FeedbackMessage({
  message,
  tone = "error",
  testID,
}: Props) {
  const palette = tonePalette[tone];
  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
      }}
      testID={testID}
    >
      <Text style={{ color: palette.text, fontWeight: "500" }}>{message}</Text>
    </View>
  );
}
