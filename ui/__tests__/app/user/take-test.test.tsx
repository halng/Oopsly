/*
 *    Copyright 2025 Hao Nguyen Tan
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
import { render } from "@testing-library/react-native";
import TakeTestScreen from "../../../app/(user)/take-test/[testSuiteId]";
import { useLocalSearchParams } from "expo-router";

const mockFlashcard = jest.fn();

jest.mock("@/screen/FlashCardReviewScreen", () => {
  const MockComponent = (props: any) => {
    mockFlashcard(props);
    return null;
  };
  return {
    __esModule: true,
    default: MockComponent,
  };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

describe("TakeTestScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders flashcard review screen when testSuiteId is provided", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ testSuiteId: "suite-123" });

    render(<TakeTestScreen />);

    expect(mockFlashcard).toHaveBeenCalledWith({ _testSuiteId: "suite-123" });
  });

  it("returns null when testSuiteId is missing", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    const { toJSON } = render(<TakeTestScreen />);

    expect(toJSON()).toBeNull();
    expect(mockFlashcard).not.toHaveBeenCalled();
  });
});
