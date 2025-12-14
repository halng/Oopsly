import { useAuthStore } from './AuthStore';

describe('useAuthStore', () => {
  const initialState = useAuthStore.getState();

  beforeEach(() => {
    useAuthStore.setState(initialState, true);
  });

  test('should initialize with default values', () => {
    const { isAuthenticated, userEmail } = useAuthStore.getState();
    
    expect(isAuthenticated).toBe(false);
    expect(userEmail).toBe('');
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