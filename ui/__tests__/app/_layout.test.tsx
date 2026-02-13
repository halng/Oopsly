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

import { render, screen, waitFor } from '@testing-library/react-native';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import RootLayout from '../../app/_layout';
import { useAuthStore } from '../../store/AuthStore';
import { AuthService } from '@/services/AuthService';

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

// Mock dependencies
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Stack = ({ children }: { children: React.ReactNode }) => {
    return <View testID="stack-wrapper">{children}</View>;
  };
  Stack.displayName = 'Stack';

  Stack.Screen = function StackScreen({ name }: { name: string }) {
    return <View testID={`screen-${name}`} />;
  };

  Stack.Protected = function StackProtected({ guard, children }: { guard: boolean; children: React.ReactNode }) {
    return guard ? <>{children}</> : null;
  };

  return {
    Stack,
    useRouter: jest.fn(),
    useSegments: jest.fn(),
  };
});

jest.mock('@/services/AuthService', () => ({
  AuthService: {
    ValidateToken: jest.fn(),
    RefreshToken: jest.fn(),
  },
}));

jest.mock('../../store/AuthStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('RootLayout', () => {
  const mockReplace = jest.fn();
  const mockPersist = {
    hasHydrated: jest.fn(),
    onFinishHydration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    (useSegments as jest.Mock).mockReturnValue([]);
    
    // Mock default auth store state
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        isAuthenticated: false,
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    (useAuthStore as unknown as jest.Mock).persist = mockPersist;
    (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
      accessToken: '',
      refreshToken: '',
      clearAuth: jest.fn(),
      setAuthTokens: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial Loading State', () => {
    it('should show loading screen while checking auth', async () => {
      mockPersist.hasHydrated.mockReturnValue(false);
      mockPersist.onFinishHydration.mockImplementation((callback) => {
        setTimeout(() => callback(), 100);
        return jest.fn();
      });

      render(<RootLayout />);

      expect(screen.getByTestId('auth-loading-screen')).toBeTruthy();
      expect(screen.getByTestId('auth-loading-spinner')).toBeTruthy();
      expect(screen.getByTestId('auth-loading-text')).toBeTruthy();
    });
  });

  describe('No Stored Tokens', () => {
    it('should not redirect when no tokens are stored', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(AuthService.ValidateToken).not.toHaveBeenCalled();
      expect(AuthService.RefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token Scenario', () => {
    it('should validate token successfully and not refresh', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      const mockSetAuthTokens = jest.fn();
      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        clearAuth: jest.fn(),
        setAuthTokens: mockSetAuthTokens,
      });

      (AuthService.ValidateToken as jest.Mock).mockResolvedValue({
        isSuccess: true,
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(AuthService.ValidateToken).toHaveBeenCalled();
      expect(AuthService.RefreshToken).not.toHaveBeenCalled();
      expect(mockSetAuthTokens).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh Scenario', () => {
    it('should refresh token when validation fails', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      const mockSetAuthTokens = jest.fn();
      const mockClearAuth = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        userEmail: 'test@example.com',
        clearAuth: mockClearAuth,
        setAuthTokens: mockSetAuthTokens,
      });

      (AuthService.ValidateToken as jest.Mock).mockRejectedValue(
        new Error('Token expired')
      );

      (AuthService.RefreshToken as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
        },
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(AuthService.ValidateToken).toHaveBeenCalled();
      expect(AuthService.RefreshToken).toHaveBeenCalledWith('valid-refresh-token', 'test@example.com');
      expect(mockSetAuthTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
      expect(mockClearAuth).not.toHaveBeenCalled();
    });

    it('should clear auth when token refresh fails', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      const mockClearAuth = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: 'expired-access-token',
        refreshToken: 'invalid-refresh-token',
        clearAuth: mockClearAuth,
        setAuthTokens: jest.fn(),
      });

      (AuthService.ValidateToken as jest.Mock).mockRejectedValue(
        new Error('Token expired')
      );

      (AuthService.RefreshToken as jest.Mock).mockRejectedValue(
        new Error('Refresh token invalid')
      );

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(AuthService.ValidateToken).toHaveBeenCalled();
      expect(AuthService.RefreshToken).toHaveBeenCalled();
      expect(mockClearAuth).toHaveBeenCalled();
    });
  });

  describe('Navigation Logic', () => {
    it('should redirect to home when authenticated and not in user group', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);
      (useSegments as jest.Mock).mockReturnValue([]);

      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          isAuthenticated: true,
          accessToken: 'valid-token',
          refreshToken: 'valid-refresh',
        };
        return selector ? selector(state) : state;
      });

      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/home');
      });
    });

    it('should redirect to root when not authenticated and in user group', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);
      (useSegments as jest.Mock).mockReturnValue(['(user)', 'home']);

      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          isAuthenticated: false,
          accessToken: '',
          refreshToken: '',
        };
        return selector ? selector(state) : state;
      });

      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle error during auth check gracefully', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      const mockClearAuth = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: 'some-token',
        refreshToken: 'some-refresh',
        clearAuth: mockClearAuth,
        setAuthTokens: jest.fn(),
      });

      (AuthService.ValidateToken as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      (AuthService.RefreshToken as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(mockClearAuth).toHaveBeenCalled();
    });

    it('should handle refresh response without data', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);

      const mockClearAuth = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh',
        clearAuth: mockClearAuth,
        setAuthTokens: jest.fn(),
      });

      (AuthService.ValidateToken as jest.Mock).mockRejectedValue(
        new Error('Token expired')
      );

      (AuthService.RefreshToken as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Failed to refresh',
        data: null,
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(mockClearAuth).toHaveBeenCalled();
    });
  });

  describe('Original Test Cases', () => {
    it('should ONLY render the public index screen when unauthenticated', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);
      
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { isAuthenticated: false };
        return selector ? selector(state) : state;
      });

      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(screen.getByTestId('screen-index')).toBeTruthy();
      expect(screen.queryByTestId('screen-(user)')).toBeNull();
    });

    it('should render the protected (user) group when authenticated', async () => {
      mockPersist.hasHydrated.mockReturnValue(true);
      
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { isAuthenticated: true };
        return selector ? selector(state) : state;
      });

      (useAuthStore as unknown as jest.Mock).getState = jest.fn().mockReturnValue({
        accessToken: '',
        refreshToken: '',
        clearAuth: jest.fn(),
        setAuthTokens: jest.fn(),
      });

      render(<RootLayout />);

      await waitFor(() => {
        expect(screen.queryByTestId('auth-loading-screen')).toBeNull();
      });

      expect(screen.getByTestId('screen-(user)')).toBeTruthy();
      expect(screen.getByTestId('screen-index')).toBeTruthy();
    });
  });
});