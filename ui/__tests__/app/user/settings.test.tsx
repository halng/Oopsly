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
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import SettingsScreen from "../../../app/(user)/settings";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/store/SettingsStore";
import { getProfile, updateSettings } from "@/services/ProfileService";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/store/SettingsStore", () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock("@/services/ProfileService", () => ({
  getProfile: jest.fn(),
  updateSettings: jest.fn(),
}));

const mockRouter = { back: jest.fn() };

const baseSettings = {
  theme: "light",
  setTheme: jest.fn(),
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSettingsStore as jest.Mock).mockImplementation((selector: any) => selector(baseSettings));
    baseSettings.theme = "light";
  });

  it("renders theme options with current selection", () => {
    render(<SettingsScreen />);

    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
  });

  it("changes theme and syncs settings", async () => {
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        settings: {
          language: "ENGLISH",
          spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
        },
      },
    });
    (updateSettings as jest.Mock).mockResolvedValue({ isSuccess: true });

    render(<SettingsScreen />);

    fireEvent.press(screen.getByText("Dark"));

    await waitFor(() => expect(baseSettings.setTheme).toHaveBeenCalledWith("dark"));
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        theme: "DARK",
        language: "ENGLISH",
        spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
      })
    );
  });

  it("navigates back when back button pressed", () => {
    render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("back-button"));

    expect(mockRouter.back).toHaveBeenCalled();
  });
});
