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

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import EmailInputScreen from '../../app/onboard';
import { otpService } from '../../services/otp';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../services/otp', () => ({
  otpService: {
    sendOTP: jest.fn(),
  },
}));

const mockSetUserEmail = jest.fn();
jest.mock('../../store/AuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    if (selector) {
      return selector({ setUserEmail: mockSetUserEmail });
    }
    return { setUserEmail: mockSetUserEmail };
  }),
}));

describe('EmailInputScreen', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ 
      push: mockPush,
      back: mockBack 
    });
    jest.clearAllMocks();
  });

  it('validates email correctly', () => {
    render(<EmailInputScreen />);
    
    const input = screen.getByPlaceholderText('name@example.com');
    const continueBtn = screen.getByLabelText('Continue button');

    // 1. Initial State: Button disabled
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    // 2. Invalid Email
    fireEvent.changeText(input, 'invalid-email');
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    // 3. Valid Email
    fireEvent.changeText(input, 'test@osmisis.com');
    expect(continueBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('handles successful OTP send and navigation', async () => {
    (otpService.sendOTP as jest.Mock).mockResolvedValue({
      status: 200,
      message: 'OTP sent successfully',
      isSuccess: true,
    });

    render(<EmailInputScreen />);
    
    const input = screen.getByPlaceholderText('name@example.com');
    fireEvent.changeText(input, 'user@example.com');
    
    const continueBtn = screen.getByLabelText('Continue button');
    fireEvent.press(continueBtn);

    // Should show loading state
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    await waitFor(() => {
      expect(otpService.sendOTP).toHaveBeenCalledWith('user@example.com');
    });

    await waitFor(() => {
      expect(mockSetUserEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockPush).toHaveBeenCalledWith('/verification');
    });
  });

  it('handles OTP send error', async () => {
    (otpService.sendOTP as jest.Mock).mockRejectedValue(new Error('Failed to send OTP'));

    render(<EmailInputScreen />);
    
    const input = screen.getByPlaceholderText('name@example.com');
    fireEvent.changeText(input, 'user@example.com');
    
    const continueBtn = screen.getByLabelText('Continue button');
    fireEvent.press(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Failed to send OTP')).toBeTruthy();
    });

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates back when arrow is pressed', () => {
    render(<EmailInputScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });
});