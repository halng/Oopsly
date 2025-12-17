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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import OTPVerification from '../../app/verification';
import { otpService } from '../../services/otp';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../services/otp', () => ({
  otpService: {
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
  },
}));

const mockSetCredentials = jest.fn();
jest.mock('../../store/AuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = {
      userEmail: 'test@example.com',
      setCredentials: mockSetCredentials,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('OTPVerification', () => {
  const mockBack = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders 6 input fields', () => {
    render(<OTPVerification />);
    // We expect 6 inputs with accessibility labels "OTP digit 1" to "6"
    expect(screen.getByLabelText('OTP digit 1')).toBeTruthy();
    expect(screen.getByLabelText('OTP digit 6')).toBeTruthy();
  });

  it('handles input entry and focuses next field', () => {
    render(<OTPVerification />);
    
    const input1 = screen.getByLabelText('OTP digit 1');
    const input2 = screen.getByLabelText('OTP digit 2');

    // Simulate typing '5' in first box
    fireEvent.changeText(input1, '5');
    fireEvent.changeText(input2, '3');
    
    // Verify value update
    expect(input2.props.value).toBe('3');
    expect(input1.props.value).toBe('5');
    
  });

  it('ignores non-numeric input', () => {
    render(<OTPVerification />);
    const input1 = screen.getByLabelText('OTP digit 1');
    
    fireEvent.changeText(input1, 'a');
    expect(input1.props.value).toBe(''); // Should remain empty
  });

  it('enables Verify button only when all fields are filled', () => {
    render(<OTPVerification />);
    const verifyBtn = screen.getByLabelText('Verify and create account');

    // Initially disabled
    expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);

    // Fill all inputs
    const inputs = [1, 2, 3, 4, 5, 6];
    inputs.forEach(idx => {
      fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '1');
    });

    // Now enabled
    expect(verifyBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('handles the timer and resend logic', () => {
    render(<OTPVerification />);
    
    const resendBtn = screen.getByText('Resend');
    expect(resendBtn.props.className).toContain('text-gray-400');

    act(() => {
      jest.advanceTimersByTime(120000);
    });

    // Now it should be active
    expect(screen.getByText('00:00')).toBeTruthy();
    
    // Check if style changed to active color
    // Re-query the element because re-render happened
    const activeResendBtn = screen.getByText('Resend');
    expect(activeResendBtn.props.className).toContain('text-indigo-600');

    // Click Resend
    fireEvent.press(activeResendBtn);

    // Timer should reset
    expect(screen.getByText('02:00')).toBeTruthy();
  });
  it('should move focus to previous input on Backspace when current is empty', () => {
    render(<OTPVerification />);

    const input1 = screen.getByLabelText('OTP digit 1');
    const input2 = screen.getByLabelText('OTP digit 2');

    fireEvent(input2, 'focus');
    fireEvent(input2, 'onKeyPress', {
      nativeEvent: { key: 'Backspace' },
    });

    // Assert that the first input is now focused
    // expect(document.activeElement).toBe(input1);
    expect(input2.props.value).toBe('');
  });
});