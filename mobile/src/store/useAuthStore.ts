import { create } from 'zustand';
import { AppMode, UserProfileResponse } from '../types/auth-user.types';
import { tokenStorage } from '../api/axiosClient';

interface AuthState {
  token: string | null;
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  activeMode: AppMode; // 'TENANT' hoặc 'LANDLORD'
  isLoading: boolean;

  // Actions
  setAuth: (token: string, user: UserProfileResponse) => Promise<void>;
  setUser: (user: UserProfileResponse) => void;
  switchMode: () => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  activeMode: 'TENANT',
  isLoading: true,

  // Đăng nhập thành công -> Lưu token vào SecureStore & cập nhật state
  setAuth: async (token, user) => {
    await tokenStorage.saveToken(token);
    set({
      token,
      user,
      isAuthenticated: true,
      activeMode: user.chuTro ? 'LANDLORD' : 'TENANT',
      isLoading: false,
    });
  },

  setUser: (user) => set({ user }),

  // Nút chuyển đổi vai trò ở trang Cá nhân
  switchMode: () => {
    const current = get().activeMode;
    const isChuTro = get().user?.chuTro;
    if (!isChuTro && current === 'TENANT') {
      alert('Bạn cần kích hoạt tài khoản Chủ trọ trước.');
      return;
    }
    set({ activeMode: current === 'TENANT' ? 'LANDLORD' : 'TENANT' });
  },

  // Đăng xuất -> Xóa token sạch sẽ
  logout: async () => {
    await tokenStorage.removeToken();
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      activeMode: 'TENANT',
      isLoading: false,
    });
  },

  // Kiểm tra token khi mở app
  checkAuth: async () => {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        set({ token, isAuthenticated: true, isLoading: false });
      } else {
        set({ token: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));