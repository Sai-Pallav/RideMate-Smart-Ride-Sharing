/**
 * Zustand Auth Store
 * Persists accessToken, refreshToken, and user info to localStorage.
 * The axios client reads accessToken from this store on every request.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),

      updateTokens: ({ accessToken, refreshToken }) =>
        set((state) => ({
          ...state,
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        })),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'ride-auth-store', // localStorage key
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export default useAuthStore;
