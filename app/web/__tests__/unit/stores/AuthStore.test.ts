import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store';

describe('useAuthStore', () => {
    // Capture the initial state when the store is first created
    const initialState = useAuthStore.getState();

    beforeEach(() => {
        // Reset the store to its initial state before every single test
        // The 'true' flag tells Zustand to replace the entire state object
        useAuthStore.setState(initialState, true);
    });

    it('initializes with default values', () => {
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.userEmail).toBe('');
        expect(state.accessToken).toBe('');
        expect(state.refreshToken).toBe('');
    });

    it('updates the user email via setUserEmail', () => {
        useAuthStore.getState().setUserEmail('test@example.com');

        expect(useAuthStore.getState().userEmail).toBe('test@example.com');
    });

    it('updates the authentication status via setIsAuthenticated', () => {
        useAuthStore.getState().setIsAuthenticated(true);
        expect(useAuthStore.getState().isAuthenticated).toBe(true);

        useAuthStore.getState().setIsAuthenticated(false);
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('sets access and refresh tokens and marks as authenticated via setAuthTokens', () => {
        useAuthStore.getState().setAuthTokens('access-123', 'refresh-456');

        const state = useAuthStore.getState();
        expect(state.accessToken).toBe('access-123');
        expect(state.refreshToken).toBe('refresh-456');
        expect(state.isAuthenticated).toBe(true);
    });

    it('sets full credentials and marks as authenticated via setCredentials', () => {
        useAuthStore
            .getState()
            .setCredentials('hello@oopsly.app', 'token-a', 'token-b');

        const state = useAuthStore.getState();
        expect(state.userEmail).toBe('hello@oopsly.app');
        expect(state.accessToken).toBe('token-a');
        expect(state.refreshToken).toBe('token-b');
        expect(state.isAuthenticated).toBe(true);
    });

    it('resets all fields to default empty values via clearAuth', () => {
        // 1. Populate the state first
        useAuthStore
            .getState()
            .setCredentials('hello@oopsly.app', 'token-a', 'token-b');

        // 2. Execute the clear action
        useAuthStore.getState().clearAuth();

        // 3. Verify everything is wiped
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.userEmail).toBe('');
        expect(state.accessToken).toBe('');
        expect(state.refreshToken).toBe('');
    });
});
