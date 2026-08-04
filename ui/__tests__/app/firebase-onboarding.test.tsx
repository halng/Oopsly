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
import LoginScreen from "@/app/login";
import ProfileSetupScreen from "@/app/profile-setup";
import { FirebaseAuthService } from "@/services/FirebaseAuthService";
import { updateProfile } from "@/services/ProfileService";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock("@/services/FirebaseAuthService", () => ({
  FirebaseAuthService: {
    sendEmailLink: jest.fn(),
    startPhoneVerification: jest.fn(),
  },
}));
jest.mock("@/services/ProfileService", () => ({ updateProfile: jest.fn() }));

describe("Firebase onboarding", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends an email sign-in link and opens verification", async () => {
    (FirebaseAuthService.sendEmailLink as jest.Mock).mockResolvedValue({});
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId("login-identifier"), "learner@example.com");
    fireEvent.press(screen.getByTestId("send-otp-button"));
    await waitFor(() => expect(FirebaseAuthService.sendEmailLink).toHaveBeenCalledWith("learner@example.com"));
    expect(mockPush).toHaveBeenCalled();
  });

  it("switches to phone login", () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("login-method-phone"));
    expect(screen.getByTestId("login-identifier").props.keyboardType).toBe("phone-pad");
  });

  it("starts SMS verification before opening phone code entry", async () => {
    (FirebaseAuthService.startPhoneVerification as jest.Mock).mockResolvedValue({
      sessionInfo: "firebase-phone-session",
    });
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("login-method-phone"));
    fireEvent.changeText(screen.getByTestId("login-identifier"), "+15551234567");
    fireEvent.press(screen.getByTestId("send-otp-button"));
    await waitFor(() => expect(FirebaseAuthService.startPhoneVerification).toHaveBeenCalledWith("+15551234567"));
    expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
      params: expect.objectContaining({ sessionInfo: "firebase-phone-session" }),
    }));
  });

  it("saves basic profile information", async () => {
    (updateProfile as jest.Mock).mockResolvedValue({ isSuccess: true, data: {} });
    render(<ProfileSetupScreen />);
    fireEvent.changeText(screen.getByTestId("profile-name"), "Ada");
    fireEvent.changeText(screen.getByTestId("profile-bio"), "Learning languages");
    fireEvent.changeText(screen.getByTestId("profile-hobbies"), "Reading");
    fireEvent.press(screen.getByTestId("save-profile-button"));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Ada", hobbies: "Reading" })));
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("shows error when email link sending fails", async () => {
    (FirebaseAuthService.sendEmailLink as jest.Mock).mockRejectedValue(new Error("Network error"));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId("login-identifier"), "learner@example.com");
    fireEvent.press(screen.getByTestId("send-otp-button"));
    await waitFor(() => expect(screen.getByTestId("login-error")).toBeTruthy());
  });

  it("shows error when phone verification fails", async () => {
    (FirebaseAuthService.startPhoneVerification as jest.Mock).mockRejectedValue(new Error("SMS failed"));
    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId("login-method-phone"));
    fireEvent.changeText(screen.getByTestId("login-identifier"), "+15551234567");
    fireEvent.press(screen.getByTestId("send-otp-button"));
    await waitFor(() => expect(screen.getByTestId("login-error")).toBeTruthy());
  });
});
