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
    <View className="bg-white px-4 py-4 rounded-b-2xl shadow-sm" testID={testID}>
      <View className="flex-row items-center justify-between">
        {onBack ? (
          <TouchableOpacity
            className="flex-row items-center"
            onPress={onBack}
            accessibilityLabel="Go back"
            testID={testID ? `${testID}-back-button` : undefined}
          >
            <ChevronLeft size={22} color="#4F46E5" />
            <Text className="text-indigo-600 font-medium ml-1">Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text className="text-xl font-bold text-gray-800">{title}</Text>
        <View>{rightSlot ?? <View />}</View>
      </View>
      {subtitle ? <Text className="text-gray-500 mt-2">{subtitle}</Text> : null}
    </View>
  );
}
