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

type Tone = "error" | "info" | "success";

type Props = {
  message: string;
  tone?: Tone;
  testID?: string;
};

const toneClassMap: Record<Tone, string> = {
  error: "bg-red-50 border-red-200 text-red-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
  success: "bg-green-50 border-green-200 text-green-700",
};

export default function FeedbackMessage({
  message,
  tone = "error",
  testID,
}: Props) {
  return (
    <View className={`border rounded-xl p-3 ${toneClassMap[tone]}`} testID={testID}>
      <Text className="font-medium">{message}</Text>
    </View>
  );
}
