import { create } from "zustand";
import { tokenManager, authApi, type AuthUser } from "@/lib/api-client";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await authApi.logout();
    tokenManager.clearTokens();
    set({ user: null });
  },
  initializeAuth: async () => {
    set({ isLoading: true });
    if (!tokenManager.isAuthenticated()) {
      set({ isLoading: false, user: null });
      return;
    }

    const result = await authApi.getMe();
    if (result.data?.user) {
      set({ user: result.data.user, isLoading: false });
    } else {
      tokenManager.clearTokens();
      set({ user: null, isLoading: false });
    }
  },
}));
