import { useAuthStore } from '../../store/AuthStore';

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

jest.mock('@/utils/secureTokens', () => ({
  saveRefreshTokenSecure: jest.fn(() => Promise.resolve()),
  deleteRefreshTokenSecure: jest.fn(() => Promise.resolve()),
  getRefreshTokenSecure: jest.fn(() => Promise.resolve(null)),
}));

describe('useAuthStore', () => {
  const initialState = useAuthStore.getState();

  beforeEach(() => {
    useAuthStore.setState(initialState, true);
  });

  describe('Initial State', () => {
    test('should initialize with default values', () => {
      const { isAuthenticated, userEmail, accessToken, refreshToken } = useAuthStore.getState();
      
      expect(isAuthenticated).toBe(false);
      expect(userEmail).toBe('');
      expect(accessToken).toBe('');
      expect(refreshToken).toBe('');
    });

    test('should have all required methods', () => {
      const state = useAuthStore.getState();
      
      expect(typeof state.setUserEmail).toBe('function');
      expect(typeof state.setIsAuthenticated).toBe('function');
      expect(typeof state.setAuthTokens).toBe('function');
      expect(typeof state.setCredentials).toBe('function');
      expect(typeof state.clearAuth).toBe('function');
    });
  });

  describe('setUserEmail', () => {
    test('should update userEmail correctly', () => {
      useAuthStore.getState().setUserEmail('test@osmisis.com');

      expect(useAuthStore.getState().userEmail).toBe('test@osmisis.com');
    });

    test('should only update userEmail without affecting other state', () => {
      // Set some initial state
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'token123' });
      
      useAuthStore.getState().setUserEmail('new@email.com');

      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('new@email.com');
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('token123');
    });

    test('should handle empty email', () => {
      useAuthStore.getState().setUserEmail('test@example.com');
      useAuthStore.getState().setUserEmail('');

      expect(useAuthStore.getState().userEmail).toBe('');
    });

    test('should handle email with special characters', () => {
      useAuthStore.getState().setUserEmail('user+tag@example.com');

      expect(useAuthStore.getState().userEmail).toBe('user+tag@example.com');
    });
  });

  describe('setIsAuthenticated', () => {
    test('should update isAuthenticated to true', () => {
      useAuthStore.getState().setIsAuthenticated(true);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    test('should update isAuthenticated to false', () => {
      useAuthStore.setState({ isAuthenticated: true });
      
      useAuthStore.getState().setIsAuthenticated(false);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    test('should only update isAuthenticated without affecting other state', () => {
      useAuthStore.setState({ userEmail: 'test@example.com', accessToken: 'token' });
      
      useAuthStore.getState().setIsAuthenticated(true);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userEmail).toBe('test@example.com');
      expect(state.accessToken).toBe('token');
    });
  });

  describe('setAuthTokens', () => {
    test('should set both access and refresh tokens', () => {
      useAuthStore.getState().setAuthTokens('access123', 'refresh456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access123');
      expect(state.refreshToken).toBe('refresh456');
    });

    test('should set isAuthenticated to true when setting tokens', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      
      useAuthStore.getState().setAuthTokens('access', 'refresh');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    test('should not affect userEmail when setting tokens', () => {
      useAuthStore.setState({ userEmail: 'existing@email.com' });
      
      useAuthStore.getState().setAuthTokens('access', 'refresh');

      expect(useAuthStore.getState().userEmail).toBe('existing@email.com');
    });

    test('should update tokens if called again', () => {
      useAuthStore.getState().setAuthTokens('old_access', 'old_refresh');
      useAuthStore.getState().setAuthTokens('new_access', 'new_refresh');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new_access');
      expect(state.refreshToken).toBe('new_refresh');
    });

    test('should handle empty tokens', () => {
      useAuthStore.getState().setAuthTokens('', '');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setCredentials', () => {
    test('should set email and both tokens', () => {
      useAuthStore.getState().setCredentials('user@example.com', 'access123', 'refresh456');

      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('user@example.com');
      expect(state.accessToken).toBe('access123');
      expect(state.refreshToken).toBe('refresh456');
    });

    test('should set isAuthenticated to true', () => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      
      useAuthStore.getState().setCredentials('user@example.com', 'access', 'refresh');

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    test('should update all credentials if called again', () => {
      useAuthStore.getState().setCredentials('old@email.com', 'old_access', 'old_refresh');
      useAuthStore.getState().setCredentials('new@email.com', 'new_access', 'new_refresh');

      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('new@email.com');
      expect(state.accessToken).toBe('new_access');
      expect(state.refreshToken).toBe('new_refresh');
    });

    test('should handle empty values', () => {
      useAuthStore.getState().setCredentials('', '', '');

      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('');
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('clearAuth', () => {
    test('should reset all auth state to initial values', () => {
      // First set some state
      useAuthStore.setState({
        isAuthenticated: true,
        userEmail: 'user@example.com',
        accessToken: 'access123',
        refreshToken: 'refresh456',
      });

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userEmail).toBe('');
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
    });

    test('should work when called on already cleared state', () => {
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userEmail).toBe('');
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
    });

    test('should clear state after setCredentials', () => {
      useAuthStore.getState().setCredentials('user@example.com', 'access', 'refresh');
      
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userEmail).toBe('');
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
    });

    test('should clear state after setAuthTokens', () => {
      useAuthStore.getState().setAuthTokens('access', 'refresh');
      
      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBe('');
      expect(useAuthStore.getState().refreshToken).toBe('');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle a full login flow simulation', () => {
      // Step 1: User enters email
      useAuthStore.getState().setUserEmail('user@example.com');
      expect(useAuthStore.getState().userEmail).toBe('user@example.com');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Step 2: User verifies OTP and receives tokens
      useAuthStore.getState().setAuthTokens('access_token', 'refresh_token');
      
      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('user@example.com');
      expect(state.accessToken).toBe('access_token');
      expect(state.refreshToken).toBe('refresh_token');
      expect(state.isAuthenticated).toBe(true);
    });

    test('should handle a full logout flow', () => {
      // Setup: User is logged in
      useAuthStore.getState().setCredentials('user@example.com', 'access', 'refresh');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Action: User logs out
      useAuthStore.getState().clearAuth();

      // Assert: All state is cleared
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userEmail).toBe('');
      expect(state.accessToken).toBe('');
      expect(state.refreshToken).toBe('');
    });

    test('should handle token refresh scenario', () => {
      // Setup: User is logged in
      useAuthStore.getState().setCredentials('user@example.com', 'old_access', 'old_refresh');

      // Action: Tokens are refreshed
      useAuthStore.getState().setAuthTokens('new_access', 'new_refresh');

      // Assert: Tokens updated, email preserved
      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('user@example.com');
      expect(state.accessToken).toBe('new_access');
      expect(state.refreshToken).toBe('new_refresh');
      expect(state.isAuthenticated).toBe(true);
    });

    test('should handle re-login with different account', () => {
      // Setup: User is logged in with first account
      useAuthStore.getState().setCredentials('user1@example.com', 'access1', 'refresh1');

      // Action: User logs out and logs in with different account
      useAuthStore.getState().clearAuth();
      useAuthStore.getState().setCredentials('user2@example.com', 'access2', 'refresh2');

      // Assert: New account is set
      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('user2@example.com');
      expect(state.accessToken).toBe('access2');
      expect(state.refreshToken).toBe('refresh2');
      expect(state.isAuthenticated).toBe(true);
    });

    test('should handle partial state updates', () => {
      // Set email first
      useAuthStore.getState().setUserEmail('user@example.com');
      
      // Set authentication without affecting email
      useAuthStore.getState().setIsAuthenticated(true);
      
      // Set tokens without affecting email
      useAuthStore.getState().setAuthTokens('access', 'refresh');

      const state = useAuthStore.getState();
      expect(state.userEmail).toBe('user@example.com');
      expect(state.accessToken).toBe('access');
      expect(state.refreshToken).toBe('refresh');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long token strings', () => {
      const longToken = 'a'.repeat(1000);
      useAuthStore.getState().setAuthTokens(longToken, longToken);

      expect(useAuthStore.getState().accessToken).toBe(longToken);
      expect(useAuthStore.getState().refreshToken).toBe(longToken);
    });

    test('should handle special characters in tokens', () => {
      const specialToken = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      useAuthStore.getState().setAuthTokens(specialToken, specialToken);

      expect(useAuthStore.getState().accessToken).toBe(specialToken);
      expect(useAuthStore.getState().refreshToken).toBe(specialToken);
    });

    test('should handle unicode characters in email', () => {
      useAuthStore.getState().setUserEmail('用户@example.com');

      expect(useAuthStore.getState().userEmail).toBe('用户@example.com');
    });

    test('should maintain state consistency after multiple rapid updates', () => {
      for (let i = 0; i < 100; i++) {
        useAuthStore.getState().setUserEmail(`user${i}@example.com`);
      }

      expect(useAuthStore.getState().userEmail).toBe('user99@example.com');
    });
  });
});