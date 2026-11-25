import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { queryClient } from '@/lib/queryClient';
import { useBookingStore } from '@/store/useBookingStore';
import type { UserProfileResponse } from '@/types/auth-user.types';

const TOKEN_KEY = 'innfinder_jwt_token';

interface AuthState {
  token: string | null;
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isChuTro: boolean;

  setAuth: (token: string, user: UserProfileResponse) => void;
  setUser: (user: UserProfileResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      isChuTro: false,

      setAuth: (token, user) => {
        localStorage.setItem(TOKEN_KEY, token);
        useBookingStore.getState().resetBookingStore();
        queryClient.clear();
        const isAdmin = user.vaiTro === 'QUAN_TRI';
        const isChuTro = !!user.chuTro;
        set({
          token,
          user,
          isAuthenticated: true,
          isAdmin,
          isChuTro,
        });
      },

      setUser: (user) => {
        const isAdmin = user.vaiTro === 'QUAN_TRI';
        const isChuTro = !!user.chuTro;
        set({
          user,
          isAdmin,
          isChuTro,
        });
      },

      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        useBookingStore.getState().resetBookingStore();
        queryClient.clear();
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          isChuTro: false,
        });
      },
    }),
    {
      name: 'innfinder_auth_storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
        isChuTro: state.isChuTro,
      }),
    },
  ),
);
