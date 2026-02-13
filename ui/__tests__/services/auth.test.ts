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


import { apiClient } from '@/services';
import {AuthService} from '@/services/AuthService';
import { ApiResponse } from '../../types/ApiRes';
import { AuthTokens } from '../../types/AuthViewModel';

jest.mock('@/services', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('AuthService', () => {
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

      const result = await AuthService.CreateOTP(mockEmail);

      expect(apiClient.post).toHaveBeenCalledWith(`/otp?email=${mockEmail}`);
      expect(result).toEqual(mockResponse);
    });

    it('should handle error when sending OTP fails', async () => {
      const errorMessage = 'Failed to send OTP';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.CreateOTP(mockEmail)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith(`/otp?email=${mockEmail}`);
    });

    it('should handle network error when sending OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(AuthService.CreateOTP(mockEmail)).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle server error response when sending OTP', async () => {
      const errorMessage = 'Invalid email format';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.CreateOTP(mockEmail)).rejects.toThrow(errorMessage);
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

      const result = await AuthService.CreateOTP(specialEmail);

      expect(apiClient.post).toHaveBeenCalledWith(`/otp?email=${specialEmail}`);
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
        access_token: 'test-access',
        refresh_token: 'test-refresh',
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

      const result = await AuthService.ValidateOTP(mockRequest.email, mockRequest.otp);

      expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', mockRequest);
      expect(result).toEqual(mockResponse);
      expect(result.data.access_token).toBe('test-access');
      expect(result.data.refresh_token).toBe('test-refresh');
      expect(result.data.type).toBe('Bearer');
    });

    it('should handle invalid OTP error', async () => {
      const errorMessage = 'OTP is invalid. Please try again.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateOTP(mockRequest.email, mockRequest.otp)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', mockRequest);
    });

    it('should handle expired OTP error', async () => {
      const errorMessage = 'OTP has expired. Please request a new one.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateOTP(mockRequest.email, mockRequest.otp)).rejects.toThrow(errorMessage);
    });

    it('should handle rate limit error', async () => {
      const errorMessage = 'OTP has been invalidated due to too many failed attempts. Try again after 5 minutes.';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateOTP(mockRequest.email, mockRequest.otp)).rejects.toThrow(errorMessage);
    });

    it('should handle network error when verifying OTP', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(AuthService.ValidateOTP(mockRequest.email, mockRequest.otp)).rejects.toThrow('Network error. Please check your connection.');
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

        const result = await AuthService.ValidateOTP(request.email, request.otp);

        expect(apiClient.post).toHaveBeenCalledWith('/otp/validate', request);
        expect(result.data.access_token).toBe(`token_${request.otp}`);
      }
    });

    it('should handle empty email gracefully', async () => {
      const emptyRequest = { email: '', otp: '123456' };
      const errorMessage = 'Invalid Email Format';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateOTP(emptyRequest.email, emptyRequest.otp)).rejects.toThrow(errorMessage);
    });

    it('should handle empty OTP gracefully', async () => {
      const emptyOtpRequest = { email: 'test@example.com', otp: '' };
      const errorMessage = 'OTP is required';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateOTP(emptyOtpRequest.email, emptyOtpRequest.otp)).rejects.toThrow(errorMessage);
    });

    it('should handle OTP with different lengths', async () => {
      const requests = [
        { email: 'test@example.com', otp: '123456' }, // 6 digits
        { email: 'test@example.com', otp: '1234' },   // 4 digits
        { email: 'test@example.com', otp: '12345678' }, // 8 digits
      ];

      for (const request of requests) {
        const mockAuthTokens: AuthTokens = {
          access_token: 'test-access',
          refresh_token: 'test-refresh',
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

        const result = await AuthService.ValidateOTP(request.email, request.otp);

        expect(result.isSuccess).toBe(true);
      }
    });
  });

  describe('ValidateToken', () => {
    it('should successfully validate access token', async () => {
      const mockResponse: ApiResponse<null> = {
        status: 200,
        message: 'Token is valid',
        data: null,
        isSuccess: true,
        timestamp: '2025-12-14T15:00:00Z',
      };

      (apiClient.get as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await AuthService.ValidateToken();

      expect(apiClient.get).toHaveBeenCalledWith('/users/validate');
      expect(result).toEqual(mockResponse);
    });

    it('should handle error when token validation fails', async () => {
      const errorMessage = 'Token is invalid or expired';
      (apiClient.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateToken()).rejects.toThrow(errorMessage);
      expect(apiClient.get).toHaveBeenCalledWith('/users/validate');
    });

    it('should handle network error when validating token', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(AuthService.ValidateToken()).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle unauthorized error', async () => {
      const errorMessage = 'Unauthorized';
      (apiClient.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.ValidateToken()).rejects.toThrow(errorMessage);
    });
  });

  describe('RefreshToken', () => {
    const mockRefreshToken = 'test-refresh-token';
    const mockUserEmail = 'test@example.com';

    it('should successfully refresh access token', async () => {
      const mockAuthTokens: AuthTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        type: 'Bearer',
      };

      const mockResponse: ApiResponse<AuthTokens> = {
        status: 200,
        message: 'Token refreshed successfully',
        data: mockAuthTokens,
        isSuccess: true,
        timestamp: '2025-12-14T15:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await AuthService.RefreshToken(mockRefreshToken, mockUserEmail);

      expect(apiClient.post).toHaveBeenCalledWith('/users/refresh-token', {
        refresh_token: mockRefreshToken,
        user_email: mockUserEmail,
      });
      expect(result).toEqual(mockResponse);
      expect(result.data.access_token).toBe('new-access-token');
      expect(result.data.refresh_token).toBe('new-refresh-token');
    });

    it('should handle error when refresh token is invalid', async () => {
      const errorMessage = 'Refresh token is invalid or expired';
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.RefreshToken(mockRefreshToken, mockUserEmail)).rejects.toThrow(errorMessage);
      expect(apiClient.post).toHaveBeenCalledWith('/users/refresh-token', {
        refresh_token: mockRefreshToken,
        user_email: mockUserEmail,
      });
    });

    it('should handle network error when refreshing token', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error. Please check your connection.'));

      await expect(AuthService.RefreshToken(mockRefreshToken, mockUserEmail)).rejects.toThrow('Network error. Please check your connection.');
    });

    it('should handle empty refresh token', async () => {
      const emptyToken = '';
      const errorMessage = 'Refresh token is required';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.RefreshToken(emptyToken, mockUserEmail)).rejects.toThrow(errorMessage);
    });

    it('should handle malformed refresh token', async () => {
      const malformedToken = 'invalid-token-format';
      const errorMessage = 'Invalid token format';
      
      (apiClient.post as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await expect(AuthService.RefreshToken(malformedToken, mockUserEmail)).rejects.toThrow(errorMessage);
    });
  });
});
