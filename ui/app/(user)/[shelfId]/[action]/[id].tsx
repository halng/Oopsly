import React from "react";

import { useLocalSearchParams } from "expo-router";
import SubjectViewDetailsScreen from "@/screen/SubjectViewDetailsScreen";
import FlashcardReviewScreen from "@/screen/FlashCardReviewScreen";
import FlashCardReviewCompleteScreen from "@/screen/FlashCardReviewCompleteScreen";
import Logger from "@/utils/Logger";

const ACTION_MAPPINGS = {
    view: (_shelfId: string, _subjectId: string) => <SubjectViewDetailsScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
    review: (_shelfId: string, _subjectId: string) => <FlashcardReviewScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
    complete : (_shelfId: string, _subjectId: string) => <FlashCardReviewCompleteScreen _shelfId={_shelfId} _subjectId={_subjectId} />,
};

const SubjectFactoryScreen = () => {
  const logger = Logger.extend("SubjectFactoryScreen");

  const params = useLocalSearchParams();
  const _shelfId = params.shelfId as string;
  const _subjectId = params.id as string;
  const _action = params.action as string;

  logger.debug(`Rendering SubjectFactoryScreen with action: ${_action}, shelfId: ${_shelfId}, subjectId: ${_subjectId}`);

  return ACTION_MAPPINGS[_action as keyof typeof ACTION_MAPPINGS](_shelfId, _subjectId);
}

export default SubjectFactoryScreen;