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
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { uiTokens } from "@/constants/uiTokens";
import { MAX_FORM_WIDTH } from "@/utils/responsiveLayout";

type Props = {
  children: ReactNode;
  contentMaxWidth?: number;
  testID?: string;
};

export default function AuthScreenLayout({
  children,
  contentMaxWidth = MAX_FORM_WIDTH,
  testID,
}: Props) {
  return (
    <LinearGradient
      colors={["#F7F8FF", "#E8E4FF", "#D8D2FF"]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
      testID={testID}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.flex}>
            <View
              style={[
                styles.content,
                contentMaxWidth
                  ? { maxWidth: contentMaxWidth, alignSelf: "center", width: "100%" }
                  : null,
              ]}
            >
              <View style={styles.centered} testID="content-container">
                <View style={styles.panel}>{children}</View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    width: "100%",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  panel: {
    backgroundColor: uiTokens.surface.default,
    borderRadius: uiTokens.radius.lg,
    padding: 24,
    ...uiTokens.shadow.floating,
  },
});
