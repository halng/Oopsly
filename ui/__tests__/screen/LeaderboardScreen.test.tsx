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
import { fireEvent, render, screen } from "@testing-library/react-native";
import LeaderboardScreen from "../../screen/LeaderboardScreen";
import { useRouter } from "expo-router";
import { getUserStats } from "@/services/UserService";
import { getProfile } from "@/services/ProfileService";
import { useAuthStore } from "@/store/AuthStore";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/UserService", () => ({
  getUserStats: jest.fn(),
}));

jest.mock("@/services/ProfileService", () => ({
  getProfile: jest.fn(),
}));

jest.mock("@/store/AuthStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockRouter = { back: jest.fn(), push: jest.fn() };

describe("LeaderboardScreen", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ userEmail: "learner@example.com" }),
    );
    (getUserStats as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        dailyStreak: 4,
        totalXp: 1200,
        cardsReviewedToday: 8,
        totalCards: 40,
        dueCards: 3,
        retentionRate: 82,
      },
    });
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { displayName: "Learner" },
    });
  });

  it("renders personal standing and preview ranks", async () => {
    render(<LeaderboardScreen />);

    expect(await screen.findByTestId("your-standing-card")).toBeTruthy();
    expect(screen.getByTestId("standing-xp")).toHaveTextContent("1200");
    expect(screen.getByTestId("standing-streak")).toHaveTextContent("4");
    expect(screen.getByTestId("leaderboard-preview-banner")).toBeTruthy();
    expect(screen.getByTestId("leaderboard-row-current")).toBeTruthy();
  });

  it("links to personal stats", async () => {
    (getUserStats as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: {
        dailyStreak: 1,
        totalXp: 10,
        cardsReviewedToday: 0,
        totalCards: 0,
        dueCards: 0,
        retentionRate: 0,
      },
    });
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { displayName: "You" },
    });

    render(<LeaderboardScreen />);

    fireEvent.press(await screen.findByTestId("leaderboard-stats-link"));
    expect(mockRouter.push).toHaveBeenCalledWith("/stats");
  });
});
