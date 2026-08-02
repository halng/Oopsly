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
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { uiTokens } from "@/constants/uiTokens";

type Props = {
  children: ReactNode;
  scrollable?: boolean;
  contentClassName?: string;
  contentMaxWidth?: number;
  testID?: string;
};

export default function ScreenContainer({
  children,
  scrollable = false,
  contentClassName = "",
  contentMaxWidth,
  testID,
}: Props) {
  const frameStyle = contentMaxWidth
    ? { width: "100%" as const, maxWidth: contentMaxWidth, alignSelf: "center" as const }
    : undefined;

  const body = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      <View className={contentClassName} style={frameStyle}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View className="flex-1 px-4" testID={testID}>
      <View className={`flex-1 ${contentClassName}`} style={frameStyle}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: uiTokens.surface.canvas }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
