import { useAuthStore } from './AuthStore';

describe('useAuthStore', () => {
  const initialState = useAuthStore.getState();

  beforeEach(() => {
    useAuthStore.setState(initialState, true);
  });

  test('should initialize with default values', () => {
    const { isAuthenticated, userEmail, accessToken, refreshToken } = useAuthStore.getState();
    
    expect(isAuthenticated).toBe(false);
    expect(userEmail).toBe('');
    expect(accessToken).toBe('');
    expect(refreshToken).toBe('');
  });

  test('should update userEmail correctly', () => {
    // Act
    useAuthStore.getState().setUserEmail('test@osmisis.com');

    // Assert
    expect(useAuthStore.getState().userEmail).toBe('test@osmisis.com');
  });

  test('should update isAuthenticated correctly', () => {
    // Act
    useAuthStore.getState().setIsAuthenticated(true);

    // Assert
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  test('should set auth tokens correctly', () => {
    // Act
    useAuthStore.getState().setAuthTokens('access_token_123', 'refresh_token_456');

    // Assert
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access_token_123');
    expect(state.refreshToken).toBe('refresh_token_456');
    expect(state.isAuthenticated).toBe(true);
  });

  test('should set credentials correctly', () => {
    // Act
    useAuthStore.getState().setCredentials('user@example.com', 'access_token_123', 'refresh_token_456');

    // Assert
    const state = useAuthStore.getState();
    expect(state.userEmail).toBe('user@example.com');
    expect(state.accessToken).toBe('access_token_123');
    expect(state.refreshToken).toBe('refresh_token_456');
    expect(state.isAuthenticated).toBe(true);
  });

  test('should clear auth correctly', () => {
    // Arrange: Set some auth data first
    useAuthStore.getState().setCredentials('user@example.com', 'access_token_123', 'refresh_token_456');

    // Act
    useAuthStore.getState().clearAuth();

    // Assert
    const state = useAuthStore.getState();
    expect(state.userEmail).toBe('');
    expect(state.accessToken).toBe('');
    expect(state.refreshToken).toBe('');
    expect(state.isAuthenticated).toBe(false);
  });

  test('should handle a full login flow simulation', () => {
    // Act: Set email then login
    useAuthStore.getState().setUserEmail('user@example.com');
    useAuthStore.getState().setIsAuthenticated(true);

    // Assert
    const state = useAuthStore.getState();
    expect(state.userEmail).toBe('user@example.com');
    expect(state.isAuthenticated).toBe(true);
  });
});