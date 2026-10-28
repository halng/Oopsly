import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    userEmail: string;
    accessToken: string;
    refreshToken: string;
    hasHydrated: boolean;
    /** Set when a refresh failed for good, so the login page can explain why. */
    sessionExpired: boolean;

    setSessionExpired: (expired: boolean) => void;
    setUserEmail: (email: string) => void;
    setIsAuthenticated: (auth: boolean) => void;
    setAuthTokens: (accessToken: string, refreshToken: string) => void;
    setCredentials: (
        email: string,
        accessToken: string,
        refreshToken: string
    ) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            userEmail: '',
            accessToken: '',
            refreshToken: '',
            hasHydrated: false,
            sessionExpired: false,

            setSessionExpired: (expired: boolean) =>
                set({ sessionExpired: expired }),

            setAuthTokens: (accessToken: string, refreshToken: string) => {
                set({ accessToken, refreshToken, isAuthenticated: true });
            },

            setCredentials: (
                email: string,
                accessToken: string,
                refreshToken: string
            ) => {
                set({
                    userEmail: email,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    sessionExpired: false,
                });
            },

            clearAuth: () => {
                set({
                    isAuthenticated: false,
                    userEmail: '',
                    accessToken: '',
                    refreshToken: '',
                });
            },

            setUserEmail: (email: string) => set({ userEmail: email }),
            setIsAuthenticated: (auth: boolean) =>
                set({ isAuthenticated: auth }),
        }),
        {
            name: 'oopsly-auth',
            storage: createJSONStorage(() => localStorage),
            skipHydration: true,
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                userEmail: state.userEmail,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }),
            onRehydrateStorage: () => () => {
                useAuthStore.setState({ hasHydrated: true });
            },
        }
    )
);
