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
    jest.useFakeTimers(); // Control time for the API simulation
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('handles loading state and navigation', async () => {
    render(<EmailInputScreen />);
    
    const input = screen.getByPlaceholderText('name@example.com');
    fireEvent.changeText(input, 'user@example.com');
    
    const continueBtn = screen.getByLabelText('Continue button');
    fireEvent.press(continueBtn);

    // Should show loading indicator (ActivityIndicator)
    // Note: ActivityIndicator usually has role="progressbar" or similar depending on RN version,
    // or we check if button is disabled during loading.
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    // Fast-forward the 1-second timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/verification');
    });
  });

  it('navigates back when arrow is pressed', () => {
    render(<EmailInputScreen />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });
});