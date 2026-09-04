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
import { useLocalSearchParams } from "expo-router";
import ScreenContainer from "@/components/common/ScreenContainer";
import FlashcardReviewScreen from "@/screen/FlashCardReviewScreen";
import { MAX_FORM_WIDTH } from "@/utils/responsiveLayout";

export default function TakeTestScreen() {
  const params = useLocalSearchParams<{
    testSuiteId: string;
    shelfId: string;
  }>();
  const testSuiteId = params.testSuiteId;
  const shelfId = params.shelfId;

  if (!testSuiteId || !shelfId) {
    return (
      <ScreenContainer
        contentMaxWidth={MAX_FORM_WIDTH}
        testID="take-test-missing-params"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold text-gray-900">
            Missing test data
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            Please go back and start the test again.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <FlashcardReviewScreen _shelfId={shelfId} _testSuiteId={testSuiteId} />
  );
}
