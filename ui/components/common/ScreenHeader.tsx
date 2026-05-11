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

import React, { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { uiTokens } from "@/constants/uiTokens";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightSlot?: ReactNode;
  testID?: string;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
  testID,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: uiTokens.surface.default,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}
      testID={testID}
    >
      <View className="flex-row items-center justify-between">
        {onBack ? (
          <TouchableOpacity
            className="flex-row items-center"
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            testID={testID ? `${testID}-back-button` : undefined}
          >
            <ChevronLeft size={22} color={uiTokens.accent.default} />
            <Text
              style={{
                color: uiTokens.accent.default,
                fontWeight: "500",
                marginLeft: 4,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: uiTokens.text.primary,
          }}
        >
          {title}
        </Text>
        <View>{rightSlot ?? <View />}</View>
      </View>
      {subtitle ? (
        <Text style={{ color: uiTokens.text.muted, marginTop: 8 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
