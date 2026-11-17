import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfileResponse } from '../types/auth-user.types';
import { tokenStorage } from '../api/axiosClient';

interface AuthState {
  token: string | null;
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isChuTro: boolean;
  
  // Actions
  setAuth: (token: string, user: UserProfileResponse) => void;
  setUser: (user: UserProfileResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: tokenStorage.getToken(),
      user: null,
      isAuthenticated: !!tokenStorage.getToken(),
      isAdmin: false,
      isChuTro: false,

      setAuth: (token, user) => {
        tokenStorage.saveToken(token);
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
        tokenStorage.removeToken();
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
    }
  )
);
