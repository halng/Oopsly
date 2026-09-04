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
import ProfileScreen from "../../../app/(user)/profile";
import { useRouter } from "expo-router";
import { getProfile, updateProfile } from "@/services/ProfileService";
import { useAuthStore } from "@/store/AuthStore";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/ProfileService", () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock("@/store/AuthStore", () => ({
  useAuthStore: jest.fn(),
}));

const mockRouter = { back: jest.fn(), push: jest.fn() };

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({ userEmail: "jane@example.com" }),
    );
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { displayName: "Jane Doe", bio: "Tester", age: 25 },
    });
  });

  it("renders loaded profile data and email", async () => {
    render(<ProfileScreen />);

    expect(await screen.findByText("Jane Doe")).toBeTruthy();
    expect(screen.getByTestId("profile-email")).toHaveTextContent("jane@example.com");
    expect(getProfile).toHaveBeenCalled();
  });

  it("shows error message when profile load fails", async () => {
    (getProfile as jest.Mock).mockRejectedValue(new Error("Network down"));

    render(<ProfileScreen />);

    expect(await screen.findByText("Network down")).toBeTruthy();
  });

  it("allows editing and saving display name", async () => {
    (getProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { displayName: "Jane Doe", bio: "QA", age: 22 },
    });
    (updateProfile as jest.Mock).mockResolvedValue({
      isSuccess: true,
      data: { displayName: "New Name", bio: "QA", age: 22 },
    });

    render(<ProfileScreen />);

    expect(await screen.findByText("Jane Doe")).toBeTruthy();

    fireEvent.press(screen.getByTestId("edit-button"));

    const input = screen.getByTestId("display-name-input");
    fireEvent.changeText(input, "  New Name  ");
    fireEvent.press(screen.getByTestId("save-button"));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: "New Name",
        bio: "QA",
        age: 22,
      }),
    );
    expect(await screen.findByText("New Name")).toBeTruthy();
  });
});
