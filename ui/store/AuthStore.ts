import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  userEmail: string;

  setUserEmail: (email: string) => void;
  setIsAuthenticated: (auth: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userEmail: "",

  setUserEmail: (email: string) => set({ userEmail: email }),
  setIsAuthenticated: (auth: boolean) => set({ isAuthenticated: auth }),
}));
