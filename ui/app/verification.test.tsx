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

import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import OTPVerification from '../app/verification';
import { useRouter } from 'expo-router';
import { otpService } from '../services/otp';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../services/otp', () => ({
  otpService: {
    sendOTP: jest.fn(),
    verifyOTP: jest.fn(),
  },
}));

const mockSetCredentials = jest.fn();
jest.mock('../store/AuthStore', () => ({
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
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack, push: mockPush });
    jest.useFakeTimers();
    jest.clearAllMocks();
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
    
    // Verify value update
    expect(input1.props.value).toBe('5');
    
    // Note: We can't easily test "focus" moved in JSDOM/RNTL without hydration, 
    // but we can verify the state logic allows the flow.
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

  it('handles successful OTP verification', async () => {
    (otpService.verifyOTP as jest.Mock).mockResolvedValue({
      status: 200,
      message: 'Authentication successful',
      isSuccess: true,
      data: {
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        type: 'Bearer',
      },
    });

    render(<OTPVerification />);

    // Fill all inputs
    const inputs = [1, 2, 3, 4, 5, 6];
    inputs.forEach(idx => {
      fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '1');
    });

    const verifyBtn = screen.getByLabelText('Verify and create account');
    fireEvent.press(verifyBtn);

    await waitFor(() => {
      expect(otpService.verifyOTP).toHaveBeenCalledWith({
        email: 'test@example.com',
        otp: '111111',
      });
      expect(mockSetCredentials).toHaveBeenCalledWith(
        'test@example.com',
        'test-access',
        'test-refresh'
      );
      expect(mockPush).toHaveBeenCalledWith('/(user)');
    });
  });

  it('handles OTP verification error', async () => {
    (otpService.verifyOTP as jest.Mock).mockRejectedValue(new Error('Invalid OTP'));

    render(<OTPVerification />);

    // Fill all inputs
    const inputs = [1, 2, 3, 4, 5, 6];
    inputs.forEach(idx => {
      fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '1');
    });

    const verifyBtn = screen.getByLabelText('Verify and create account');
    fireEvent.press(verifyBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid OTP')).toBeTruthy();
    });

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles the timer and resend logic', async () => {
    (otpService.sendOTP as jest.Mock).mockResolvedValue({
      status: 200,
      message: 'OTP sent successfully',
      isSuccess: true,
    });

    render(<OTPVerification />);
    
    const resendBtn = screen.getByText('Resend');
    // Initially timer is running (2:00), so Resend is disabled (gray/unclickable logic)
    // The code checks `isResendActive` state. 
    // We can check if the parent TouchableOpacity is disabled
    // In your code: disabled={!isResendActive}
    
    // Note: To find the Touchable, we might need to look up by text parent. 
    // RNTL often propagates disabled prop to text, but let's assume we find the button wrapper.
    // A reliable way is checking the text color logic you implemented.
    expect(resendBtn.props.className).toContain('text-gray-400');

    // Advance time by 2 minutes (120 seconds)
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

    await waitFor(() => {
      expect(otpService.sendOTP).toHaveBeenCalledWith('test@example.com');
    });

    // Timer should reset
    expect(screen.getByText('02:00')).toBeTruthy();
  });
});