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
import SubjectViewDetailsScreen from "@/screen/SubjectViewDetailsScreen";
import FlashcardReviewScreen from "@/screen/FlashCardReviewScreen";
import FlashCardReviewCompleteScreen from "@/screen/FlashCardReviewCompleteScreen";
import LearnModeScreen from "@/screen/LearnModeScreen";
import MatchingGameScreen from "@/screen/MatchingGameScreen";
import Logger from "@/utils/Logger";
import { MAX_FORM_WIDTH } from "@/utils/responsiveLayout";

const ACTION_MAPPINGS = {
    view: (_shelfId: string, _subjectId: string) => <SubjectViewDetailsScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
    review: (_shelfId: string, _subjectId: string) => <FlashcardReviewScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
    complete : (_shelfId: string, _subjectId: string) => <FlashCardReviewCompleteScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
    learn: (_shelfId: string, _subjectId: string) => <LearnModeScreen shelfId={_shelfId} subjectId={_subjectId} />,
    match: (_shelfId: string, _subjectId: string) => <MatchingGameScreen shelfId={_shelfId} subjectId={_subjectId} />,
};

const SubjectFactoryScreen = () => {
  const logger = Logger.extend("SubjectFactoryScreen");

  const params = useLocalSearchParams();
  const _shelfId = params.shelfId as string;
  const _subjectId = params.id as string;
  const _action = params.action as string;

  logger.debug(`Rendering SubjectFactoryScreen with action: ${_action}, shelfId: ${_shelfId}, subjectId: ${_subjectId}`);

  const builder = ACTION_MAPPINGS[_action as keyof typeof ACTION_MAPPINGS];
  if (!builder) {
    return (
      <ScreenContainer
        contentMaxWidth={MAX_FORM_WIDTH}
        testID="invalid-action-state"
      >
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg font-semibold text-gray-900">
            Unknown action
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            This review route is not available.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return builder(_shelfId, _subjectId);
}

export default SubjectFactoryScreen;