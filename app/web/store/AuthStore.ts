import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
    isAuthenticated: boolean;
    userEmail: string;
    accessToken: string;
    refreshToken: string;
    hasHydrated: boolean;

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
