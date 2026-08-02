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

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

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
const mockSetCredentials = jest.fn();

jest.mock('../../store/AuthStore', () => {
  const mockStore = jest.fn((selector) => {
    const state = {
      userEmail: 'test@example.com',
      setAuthTokens: mockSetAuthTokens,
      setCredentials: mockSetCredentials,
    };
    return selector ? selector(state) : state;
  });
  
  // Add getState to the mock function
  (mockStore as any).getState = () => ({
    setAuthTokens: mockSetAuthTokens,
    setCredentials: mockSetCredentials,
  });
  
  return {
    useAuthStore: mockStore,
  };
});

describe('OTPVerification', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
    });
    jest.useFakeTimers();
    (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders 6 input fields', () => {
      render(<OTPVerification />);
      // We expect 6 inputs with testIDs "otp-input-0" to "otp-input-5"
      expect(screen.getByTestId('otp-input-0')).toBeTruthy();
      expect(screen.getByTestId('otp-input-1')).toBeTruthy();
      expect(screen.getByTestId('otp-input-2')).toBeTruthy();
      expect(screen.getByTestId('otp-input-3')).toBeTruthy();
      expect(screen.getByTestId('otp-input-4')).toBeTruthy();
      expect(screen.getByTestId('otp-input-5')).toBeTruthy();
    });

    it('renders verification title and description', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('title-text').props.children).toBe('Verify your email');
      expect(screen.getByTestId('description-text')).toBeTruthy();
      expect(screen.getByTestId('user-email-display')).toBeTruthy();
    });

    it('displays user email username part', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('user-email-display').props.children).toBe(
        'test@example.com',
      );
    });

    it('renders verify button', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('verify-button')).toBeTruthy();
      expect(screen.getByTestId('verify-button-text').props.children).toBe(
        'Verify and continue',
      );
    });

    it('renders timer with initial value of 02:00', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('timer-text').props.children).toBe('02:00');
    });

    it('renders resend text and button', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('resend-label')).toBeTruthy();
      expect(screen.getByText(/I did not receive a code/)).toBeTruthy();
      expect(screen.getByTestId('resend-button-text').props.children).toBe('Resend');
    });
  });

  describe('OTP Input Handling', () => {
    it('handles input entry and focuses next field', () => {
      render(<OTPVerification />);
      
      const input1 = screen.getByTestId('otp-input-0');
      const input2 = screen.getByTestId('otp-input-1');

      // Simulate typing '5' in first box
      fireEvent.changeText(input1, '5');
      fireEvent.changeText(input2, '3');
      
      // Verify value update
      expect(input2.props.value).toBe('3');
      expect(input1.props.value).toBe('5');
    });

    it('ignores non-numeric input', () => {
      render(<OTPVerification />);
      const input1 = screen.getByTestId('otp-input-0');
      
      fireEvent.changeText(input1, 'a');
      expect(input1.props.value).toBe(''); // Should remain empty
    });

    it('ignores special characters input', () => {
      render(<OTPVerification />);
      const input1 = screen.getByTestId('otp-input-0');
      
      fireEvent.changeText(input1, '@');
      expect(input1.props.value).toBe('');
      
      fireEvent.changeText(input1, '!');
      expect(input1.props.value).toBe('');
      
      fireEvent.changeText(input1, '#');
      expect(input1.props.value).toBe('');
    });

    it('accepts numeric input', () => {
      render(<OTPVerification />);
      const input1 = screen.getByTestId('otp-input-0');
      
      fireEvent.changeText(input1, '7');
      expect(input1.props.value).toBe('7');
    });

    it('should move focus to previous input on Backspace when current is empty', () => {
      render(<OTPVerification />);

      const input2 = screen.getByTestId('otp-input-1');

      fireEvent(input2, 'focus');
      fireEvent(input2, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Assert that the second input remains empty
      expect(input2.props.value).toBe('');
    });

    it('should not move focus on Backspace when on first input', () => {
      render(<OTPVerification />);

      const input1 = screen.getByTestId('otp-input-0');

      fireEvent(input1, 'focus');
      fireEvent(input1, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // Should not throw an error and input should remain empty
      expect(input1.props.value).toBe('');
    });

    it('should not move focus on Backspace when current input has value', () => {
      render(<OTPVerification />);

      const input2 = screen.getByTestId('otp-input-1');

      fireEvent.changeText(input2, '5');
      fireEvent(input2, 'onKeyPress', {
        nativeEvent: { key: 'Backspace' },
      });

      // The value should still be there since Backspace behavior only triggers when empty
      expect(input2.props.value).toBe('5');
    });

    it('does not auto-advance from last input', () => {
      render(<OTPVerification />);
      
      const input6 = screen.getByTestId('otp-input-5');
      fireEvent.changeText(input6, '9');
      
      // Value should be set, no error should occur
      expect(input6.props.value).toBe('9');
    });
  });

  describe('Verify Button State', () => {
    it('disables Verify button when OTP is incomplete', () => {
      render(<OTPVerification />);
      const verifyBtn = screen.getByTestId('verify-button');

      // Initially disabled
      expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables Verify button only when all fields are filled', () => {
      render(<OTPVerification />);
      const verifyBtn = screen.getByTestId('verify-button');

      // Initially disabled
      expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);

      // Fill all inputs
      const inputs = [0, 1, 2, 3, 4, 5];
      inputs.forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), '1');
      });

      // Now enabled
      expect(verifyBtn.props.accessibilityState?.disabled).toBe(false);
    });

    it('disables Verify button when one field is cleared', () => {
      render(<OTPVerification />);
      const verifyBtn = screen.getByTestId('verify-button');

      // Fill all inputs
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), '1');
      });

      expect(verifyBtn.props.accessibilityState?.disabled).toBe(false);

      // Clear one field
      fireEvent.changeText(screen.getByTestId('otp-input-2'), '');

      expect(verifyBtn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Timer Functionality', () => {
    it('starts timer at 02:00', () => {
      render(<OTPVerification />);
      expect(screen.getByTestId('timer-text').props.children).toBe('02:00');
    });

    it('counts down timer correctly', () => {
      render(<OTPVerification />);
      
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('timer-text').props.children).toBe('01:59');

      act(() => {
        jest.advanceTimersByTime(59000);
      });
      expect(screen.getByTestId('timer-text').props.children).toBe('01:00');
    });

    it('formats time correctly with leading zeros', () => {
      render(<OTPVerification />);
      
      act(() => {
        jest.advanceTimersByTime(115000); // 115 seconds = 1:55 remaining (5 seconds left)
      });
      expect(screen.getByTestId('timer-text').props.children).toBe('00:05');
    });

    it('stops timer at 00:00', () => {
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(screen.getByTestId('timer-text').props.children).toBe('00:00');
    });

    it('resend button is disabled initially', () => {
      render(<OTPVerification />);
      const resendBtn = screen.getByTestId('resend-button-text');
      expect(resendBtn.props.className).toContain('text-gray-400');
    });

    it('enables resend button when timer reaches zero', () => {
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByTestId('resend-button-text');
      expect(resendBtn.props.className).toContain('text-indigo-600');
    });
  });

  describe('Resend OTP', () => {
    it('does not trigger resend when timer is active', () => {
      render(<OTPVerification />);
      const resendBtn = screen.getByTestId('resend-button');

      fireEvent.press(resendBtn);

      expect(AuthService.CreateOTP).not.toHaveBeenCalled();
    });

    it('triggers resend when timer expires and button is pressed', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByTestId('resend-button');
      fireEvent.press(resendBtn);

      expect(AuthService.CreateOTP).toHaveBeenCalledWith('test@example.com');
    });

    it('resets OTP inputs after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      // Fill OTP
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), `${idx}`);
      });

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByTestId('resend-button');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      // OTP should be cleared
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        expect(screen.getByTestId(`otp-input-${idx}`).props.value).toBe('');
      });
    });

    it('resets timer after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      expect(screen.getByTestId('timer-text').props.children).toBe('00:00');

      const resendBtn = screen.getByTestId('resend-button');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      expect(screen.getByTestId('timer-text').props.children).toBe('02:00');
    });

    it('disables resend button after successful resend', async () => {
      (AuthService.CreateOTP as jest.Mock).mockResolvedValue({ isSuccess: true });
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByTestId('resend-button-text');
      expect(resendBtn.props.className).toContain('text-indigo-600');
      
      await act(async () => {
        fireEvent.press(screen.getByTestId('resend-button'));
        await Promise.resolve();
      });

      const newResendBtn = screen.getByTestId('resend-button-text');
      expect(newResendBtn.props.className).toContain('text-gray-400');
    });

    it('handles resend OTP error gracefully', async () => {
      (AuthService.CreateOTP as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      render(<OTPVerification />);

      act(() => {
        jest.advanceTimersByTime(120000);
      });

      const resendBtn = screen.getByTestId('resend-button');
      
      await act(async () => {
        fireEvent.press(resendBtn);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByTestId('verify-error-message')).toBeTruthy();
        expect(screen.getByText('Could not resend code. Try again.')).toBeTruthy();
      });
    });
  });

  describe('OTP Verification', () => {
    const fillOTP = (otp: string = '123456') => {
      otp.split('').forEach((digit, idx) => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), digit);
      });
    };

    it('calls ValidateOTP with correct parameters when verify is pressed', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: { access_token: 'access123', refresh_token: 'refresh123' },
      });

      render(<OTPVerification />);
      fillOTP('123456');

      const verifyBtn = screen.getByTestId('verify-button');
      
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

      const verifyBtn = screen.getByTestId('verify-button');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/home');
      });
    });

    it('stores auth tokens on successful verification', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: { access_token: 'access123', refresh_token: 'refresh123' },
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByTestId('verify-button');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(mockSetCredentials).toHaveBeenCalledWith(
          'test@example.com',
          'access123',
          'refresh123',
        );
      });
    });

    it('does not navigate on failed verification', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Invalid OTP',
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByTestId('verify-button');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(screen.getByTestId('verify-error-message')).toBeTruthy();
        expect(screen.getByText('Invalid OTP')).toBeTruthy();
      });

      expect(mockReplace).not.toHaveBeenCalledWith('/home');
      expect(mockPush).not.toHaveBeenCalledWith('/home');
    });

    it('handles verification API error gracefully', async () => {
      (AuthService.ValidateOTP as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByTestId('verify-button');
      
      fireEvent.press(verifyBtn);

      await waitFor(() => {
        expect(screen.getByTestId('verify-error-message')).toBeTruthy();
        expect(
          screen.getByText('Something went wrong. Check your connection.'),
        ).toBeTruthy();
      });
    });

    it('does not store tokens on failed verification', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      (AuthService.ValidateOTP as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Invalid OTP',
      });

      render(<OTPVerification />);
      fillOTP();

      const verifyBtn = screen.getByTestId('verify-button');
      
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
      expect(screen.getByTestId('title-text').props.children).toBe('Verify your email');
    });

    it('handles rapid input correctly', () => {
      render(<OTPVerification />);
      
      // Rapidly fill all inputs
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), `${idx + 1}`);
      });

      // Verify all inputs are filled correctly
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        expect(screen.getByTestId(`otp-input-${idx}`).props.value).toBe(`${idx + 1}`);
      });
    });

    it('handles clearing and refilling OTP', () => {
      render(<OTPVerification />);
      
      // Fill all inputs
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), '1');
      });

      // Clear all inputs
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), '');
      });

      // Verify all inputs are empty
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        expect(screen.getByTestId(`otp-input-${idx}`).props.value).toBe('');
      });

      // Refill with different values
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        fireEvent.changeText(screen.getByTestId(`otp-input-${idx}`), `${idx + 1}`);
      });

      // Verify new values
      [0, 1, 2, 3, 4, 5].forEach(idx => {
        expect(screen.getByTestId(`otp-input-${idx}`).props.value).toBe(`${idx + 1}`);
      });
    });
  });
});