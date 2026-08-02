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
  theme: "light" as const,
  setTheme: jest.fn(),
};

const profileSettings = {
  language: "ENGLISH",
  spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
  studySchedule: {
    preferredStudyTime: "09:00",
    studyDays: [1, 2, 3, 4, 5],
    reminderEnabled: false,
  },
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSettingsStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector(baseSettings),
    );
    baseSettings.theme = "light";
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { settings: profileSettings },
    });
    (updateSettings as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { settings: profileSettings },
    });
  });

  it("renders theme options and study schedule after load", async () => {
    render(<SettingsScreen />);

    expect(await screen.findByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByTestId("study-schedule-section")).toBeTruthy();
    expect(screen.getByTestId("study-time-input")).toBeTruthy();
  });

  it("changes theme and syncs settings including study schedule", async () => {
    render(<SettingsScreen />);

    fireEvent.press(await screen.findByText("Dark"));

    await waitFor(() => expect(baseSettings.setTheme).toHaveBeenCalledWith("dark"));
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        theme: "DARK",
        language: "ENGLISH",
        spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
        studySchedule: profileSettings.studySchedule,
      }),
    );
  });

  it("saves study schedule", async () => {
    render(<SettingsScreen />);

    const timeInput = await screen.findByTestId("study-time-input");
    fireEvent.changeText(timeInput, "18:30");
    fireEvent.press(screen.getByTestId("study-day-0"));
    fireEvent(screen.getByTestId("reminder-toggle"), "valueChange", true);
    fireEvent.press(screen.getByTestId("save-schedule-button"));

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          studySchedule: expect.objectContaining({
            preferredStudyTime: "18:30",
            reminderEnabled: true,
            studyDays: expect.arrayContaining([0, 1, 2, 3, 4, 5]),
          }),
        }),
      ),
    );
    expect(await screen.findByTestId("settings-success")).toBeTruthy();
  });

  it("navigates back when back button pressed", async () => {
    render(<SettingsScreen />);
    fireEvent.press(await screen.findByTestId("settings-header-back-button"));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
