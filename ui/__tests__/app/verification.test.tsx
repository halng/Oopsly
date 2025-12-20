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

import { AuthService } from '@/services/AuthService';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import OTPVerification from '../../app/verification';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/services/AuthService', () => ({
  AuthService: {
    CreateOTP: jest.fn(),
    ValidateOTP: jest.fn(),
  },
}));

const mockSetAuthTokens = jest.fn();

jest.mock('../../store/AuthStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      userEmail: 'test@example.com',
      setAuthTokens: mockSetAuthTokens,
    };
    return selector ? selector(state) : state;
  });
  
  // Add getState to the mock function
  (mockStore as any).getState = () => ({
    setAuthTokens: mockSetAuthTokens,
  });
  
  return {
    useAuthStore: mockStore,
  };
});

describe('OTPVerification', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    jest.useFakeTimers();
    (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders 6 input fields', () => {
      render(<OTPVerification />);
      // We expect 6 inputs with accessibility labels "OTP digit 1" to "6"
      expect(screen.getByLabelText('OTP digit 1')).toBeTruthy();
      expect(screen.getByLabelText('OTP digit 2')).toBeTruthy();
      expect(screen.getByLabelText('OTP digit 3')).toBeTruthy();
      expect(screen.getByLabelText('OTP digit 4')).toBeTruthy();
      expect(screen.getByLabelText('OTP digit 5')).toBeTruthy();
      expect(screen.getByLabelText('OTP digit 6')).toBeTruthy();
    });

    it('renders header with back button', () => {
      render(<OTPVerification />);
      expect(screen.getByLabelText('Go back')).toBeTruthy();
    });

    it('renders verification title and description', () => {
      render(<OTPVerification />);
      expect(screen.getByText('Verify your email')).toBeTruthy();
      expect(screen.getByText(/Enter the code sent to/)).toBeTruthy();
    });

    it('displays user email username part', () => {
      render(<OTPVerification />);
      // The email is test@example.com, so it should display "test"
      expect(screen.getByText('test')).toBeTruthy();
    });

    it('renders verify button', () => {
      render(<OTPVerification />);
      expect(screen.getByLabelText('Verify and create account')).toBeTruthy();
      expect(screen.getByText('Verify & Create Account')).toBeTruthy();
    });

    it('renders timer with initial value of 02:00', () => {
      render(<OTPVerification />);
      expect(screen.getByText('02:00')).toBeTruthy();
    });

    it('renders resend text and button', () => {
      render(<OTPVerification />);
      expect(screen.getByText("I didn't receive code.")).toBeTruthy();
      expect(screen.getByText('Resend')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates back to onboard when back button is pressed', () => {
      render(<OTPVerification />);
      const backButton = screen.getByLabelText('Go back');
      
      fireEvent.press(backButton);
      
      expect(mockPush).toHaveBeenCalledWith('/onboard');
    });
  });

  describe('OTP Input Handling', () => {
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

    it('ignores special characters input', () => {
      render(<OTPVerification />);
      const input1 = screen.getByLabelText('OTP digit 1');
      
      fireEvent.changeText(input1, '@');
      expect(input1.props.value).toBe('');
      
      fireEvent.changeText(input1, '!');
      expect(input1.props.value).toBe('');
      
      fireEvent.changeText(input1, '#');
      expect(input1.props.value).toBe('');
    });

    it('accepts numeric input', () => {
      render(<OTPVerification />);
      const input1 = screen.getByLabelText('OTP digit 1');
      
      fireEvent.changeText(input1, '7');
      expect(input1.props.value).toBe('7');
    });

    it('should move focus to previous input on Backspace when current is empty', () => {
      render(<OTPVerification />);

      const input2 = screen.getByLabelText('OTP digit 2');

      fireEvent(input2, 'focus');
      fireEvent(input2, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Assert that the second input remains empty
      expect(input2.props.value).toBe('');
    });

    it('should not move focus on Backspace when on first input', () => {
      render(<OTPVerification />);

      const input1 = screen.getByLabelText('OTP digit 1');

      fireEvent(input1, 'focus');
      fireEvent(input1, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Should not throw an error and input should remain empty
      expect(input1.props.value).toBe('');
    });

    it('should not move focus on Backspace when current input has value', () => {
      render(<OTPVerification />);

      const input2 = screen.getByLabelText('OTP digit 2');

      fireEvent.changeText(input2, '5');
      fireEvent(input2, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // The value should still be there since Backspace behavior only triggers when empty
      expect(input2.props.value).toBe('5');
    });

    it('does not auto-advance from last input', () => {
      render(<OTPVerification />);
      
      const input6 = screen.getByLabelText('OTP digit 6');
      fireEvent.changeText(input6, '9');
      
      // Value should be set, no error should occur
      expect(input6.props.value).toBe('9');
    });
  });

  describe('Verify Button State', () => {
    it('disables Verify button when OTP is incomplete', () => {
      render(<OTPVerification />);
      const verifyBtn = screen.getByLabelText('Verify and create account');

      // Initially disabled
      expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);
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

    it('disables Verify button when one field is cleared', () => {
      render(<OTPVerification />);
      const verifyBtn = screen.getByLabelText('Verify and create account');

      // Fill all inputs
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '1');
      });

      expect(verifyBtn.props.accessibilityState?.disabled).toBe(false);

      // Clear one field
      fireEvent.changeText(screen.getByLabelText('OTP digit 3'), '');

      expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Timer Functionality', () => {
    it('starts timer at 02:00', () => {
      render(<OTPVerification />);
      expect(screen.getByText('02:00')).toBeTruthy();
    });

    it('counts down timer correctly', () => {
      render(<OTPVerification />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('01:59')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(59000);
      });
      expect(screen.getByText('01:00')).toBeTruthy();
    });

    it('formats time correctly with leading zeros', () => {
      render(<OTPVerification />);
      
      act(() => {
        jest.advanceTimersByTime(115000); // 115 seconds = 1:55 remaining (5 seconds left)
      });
      expect(screen.getByText('00:05')).toBeTruthy();
    });

    it('stops timer at 00:00', () => {
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(screen.getByText('00:00')).toBeTruthy();
    });

    it('resend button is disabled initially', () => {
      render(<OTPVerification />);
      const resendBtn = screen.getByText('Resend');
      expect(resendBtn.props.className).toContain('text-gray-400');
    });

    it('enables resend button when timer reaches zero', () => {
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByText('Resend');
      expect(resendBtn.props.className).toContain('text-indigo-600');
    });
  });

  describe('Resend OTP', () => {
    it('does not trigger resend when timer is active', () => {
      render(<OTPVerification />);
      const resendBtn = screen.getByText('Resend');

      fireEvent.press(resendBtn);

      expect(AuthService.CreateOTP).not.toHaveBeenCalled();
    });

    it('triggers resend when timer expires and button is pressed', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByText('Resend');
      fireEvent.press(resendBtn);

      expect(AuthService.CreateOTP).toHaveBeenCalledWith('test@example.com');
    });

    it('resets OTP inputs after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      // Fill OTP
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), `${idx}`);
      });

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByText('Resend');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      // OTP should be cleared
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        expect(screen.getByLabelText(`OTP digit ${idx}`).props.value).toBe('');
      });
    });

    it('resets timer after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(screen.getByText('00:00')).toBeTruthy();

      const resendBtn = screen.getByText('Resend');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      expect(screen.getByText('02:00')).toBeTruthy();
    });

    it('disables resend button after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByText('Resend');
      expect(resendBtn.props.className).toContain('text-indigo-600');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      const newResendBtn = screen.getByText('Resend');
      expect(newResendBtn.props.className).toContain('text-gray-400');
    });

    it('handles resend OTP error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (AuthService.CreateOTP as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByText('Resend');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error resending OTP:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('OTP Verification', () => {
    const fillOTP = (otp: string = '123456') => {
      otp.split('').forEach((digit, idx) => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx + 1}`), digit);
      });
    };

    it('calls ValidateOTP with correct parameters when verify is pressed', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: { access_token: 'access123', refresh_token: 'refresh123' },
      });

      render(<OTPVerification />);
      fillOTP('123456');

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);
      
      await waitFor(() => {
        expect(AuthService.ValidateOTP).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });

    it('navigates to home on successful verification', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: { access_token: 'access123', refresh_token: 'refresh123' },
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/home');
      });
    });

    it('stores auth tokens on successful verification', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: { access_token: 'access123', refresh_token: 'refresh123' },
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(mockSetAuthTokens).toHaveBeenCalledWith('access123', 'refresh123');
      });
    });

    it('does not navigate on failed verification', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Invalid OTP',
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('OTP verification failed:', 'Invalid OTP');
      });

      expect(mockPush).not.toHaveBeenCalledWith('/home');
      expect(consoleErrorSpy).toHaveBeenCalledWith('OTP verification failed:', 'Invalid OTP');
      consoleErrorSpy.mockRestore();
    });

    it('handles verification API error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (AuthService.ValidateOTP as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error verifying OTP:', expect.any(Error));
      });
      consoleErrorSpy.mockRestore();
    });

    it('does not store tokens on failed verification', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Invalid OTP',
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByLabelText('Verify and create account');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(mockSetAuthTokens).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty email gracefully', () => {
      // Override mock for this test
      const { useAuthStore } = require('../../store/AuthStore');
      useAuthStore.mockImplementation((selector: any) => {
        const state = {
          userEmail: '',
          setAuthTokens: mockSetAuthTokens,
        };
        return selector ? selector(state) : state;
      });

      render(<OTPVerification />);
      // Should render without crashing
      expect(screen.getByText('Verify your email')).toBeTruthy();
    });

    it('handles rapid input correctly', () => {
      render(<OTPVerification />);
      
      // Rapidly fill all inputs
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), `${idx}`);
      });

      // Verify all inputs are filled correctly
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        expect(screen.getByLabelText(`OTP digit ${idx}`).props.value).toBe(`${idx}`);
      });
    });

    it('handles clearing and refilling OTP', () => {
      render(<OTPVerification />);
      
      // Fill all inputs
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '1');
      });

      // Clear all inputs
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), '');
      });

      // Verify all inputs are empty
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        expect(screen.getByLabelText(`OTP digit ${idx}`).props.value).toBe('');
      });

      // Refill with different values
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        fireEvent.changeText(screen.getByLabelText(`OTP digit ${idx}`), `${idx}`);
      });

      // Verify new values
      [1, 2, 3, 4, 5, 6].forEach(idx => {
        expect(screen.getByLabelText(`OTP digit ${idx}`).props.value).toBe(`${idx}`);
      });
    });
  });
});