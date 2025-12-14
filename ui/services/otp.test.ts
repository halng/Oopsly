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

import { otpService } from './otp';
import { apiClient } from '../config/axiosClient';
import { ApiResponse } from '../types/api';
import { AuthTokens } from '../types/AuthViewModel';

jest.mock('../config/axiosClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('otpService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOTP', () => {
    const mockEmail = 'test@example.com';

    it('should successfully send OTP', async () => {
      const mockResponse: ApiResponse<null> = {
        status: 200,
        message: 'OTP sent successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-14T15:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await otpService.sendOTP(mockEmail);

      expect(apiClient.post).toHaveBeenCalledWith('/otp', null, {
        params: { email: mockEmail },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle error when sending OTP fails', async () => {
      const errorMessage = 'Failed to send OTP';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.sendOTP(mockEmail)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith('/otp', null, {
        params: { email: mockEmail },
      });
    });

    it('should handle network error when sending OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(otpService.sendOTP(mockEmail)).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle server error response when sending OTP', async () => {
      const errorMessage = 'Invalid email format';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.sendOTP(mockEmail)).rejects.toThrow(errorMessage);
    });

    it('should send OTP with special characters in email', async () => {
      const specialEmail = 'test+special@example.com';
      const mockResponse: ApiResponse<null> = {
        status: 200,
        message: 'OTP sent successfully',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-14T15:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await otpService.sendOTP(specialEmail);

      expect(apiClient.post).toHaveBeenCalledWith('/otp', null, {
        params: { email: specialEmail },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyOTP', () => {
    const mockRequest = {
      email: 'test@example.com',
      otp: '123456',
    };

    it('should successfully verify OTP and return auth tokens', async () => {
      const mockAuthTokens: AuthTokens = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        type: 'Bearer',
      };

      const mockResponse: ApiResponse<AuthTokens> = {
        status: 200,
        message: 'Authentication successful',
        data: mockAuthTokens,
        isSuccess: true,
        timestamp: '2025-12-14T15:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await otpService.verifyOTP(mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(result.data.access_token).toBe('mock_access_token');
      expect(result.data.refresh_token).toBe('mock_refresh_token');
      expect(result.data.type).toBe('Bearer');
    });

    it('should handle invalid OTP error', async () => {
      const errorMessage = 'OTP is invalid. Please try again.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.verifyOTP(mockRequest)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', mockRequest);
    });

    it('should handle expired OTP error', async () => {
      const errorMessage = 'OTP has expired. Please request a new one.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.verifyOTP(mockRequest)).rejects.toThrow(errorMessage);
    });

    it('should handle rate limit error', async () => {
      const errorMessage = 'OTP has been invalidated due to too many failed attempts. Try again after 5 minutes.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.verifyOTP(mockRequest)).rejects.toThrow(errorMessage);
    });

    it('should handle network error when verifying OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(otpService.verifyOTP(mockRequest)).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should verify OTP with different email formats', async () => {
      const requests = [
        { email: 'user@example.com', otp: '123456' },
        { email: 'test+tag@example.co.uk', otp: '654321' },
        { email: 'admin@subdomain.example.com', otp: '111111' },
      ];

      for (const request of requests) {
        const mockAuthTokens: AuthTokens = {
          access_token: `token_${request.otp}`,
          refresh_token: `refresh_${request.otp}`,
          type: 'Bearer',
        };

        const mockResponse: ApiResponse<AuthTokens> = {
          status: 200,
          message: 'Authentication successful',
          data: mockAuthTokens,
          isSuccess: true,
          timestamp: '2025-12-14T15:00:00Z',
        };

        (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

        const result = await otpService.verifyOTP(request);

        expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', request);
        expect(result.data.access_token).toBe(`token_${request.otp}`);
      }
    });

    it('should handle empty email gracefully', async () => {
      const emptyRequest = { email: '', otp: '123456' };
      const errorMessage = 'Invalid Email Format';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.verifyOTP(emptyRequest)).rejects.toThrow(errorMessage);
    });

    it('should handle empty OTP gracefully', async () => {
      const emptyOtpRequest = { email: 'test@example.com', otp: '' };
      const errorMessage = 'OTP is required';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(otpService.verifyOTP(emptyOtpRequest)).rejects.toThrow(errorMessage);
    });

    it('should handle OTP with different lengths', async () => {
      const requests = [
        { email: 'test@example.com', otp: '123456' }, // 6 digits
        { email: 'test@example.com', otp: '1234' },   // 4 digits
        { email: 'test@example.com', otp: '12345678' }, // 8 digits
      ];

      for (const request of requests) {
        const mockAuthTokens: AuthTokens = {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          type: 'Bearer',
        };

        const mockResponse: ApiResponse<AuthTokens> = {
          status: 200,
          message: 'Authentication successful',
          data: mockAuthTokens,
          isSuccess: true,
          timestamp: '2025-12-14T15:00:00Z',
        };

        (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

        const result = await otpService.verifyOTP(request);

        expect(result.isSuccess).toBe(true);
      }
    });
  });
});
