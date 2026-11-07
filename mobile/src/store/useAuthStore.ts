import { create } from 'zustand';
import { AppMode, UserProfileResponse } from '../types/auth-user.types';
import { tokenStorage } from '../api/axiosClient';
import { authUserService } from '../services/authUser.service';

interface AuthState {
  token: string | null;
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  activeMode: AppMode; // 'TENANT' | 'LANDLORD' | 'ADMIN'
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
    const mode: AppMode = user.vaiTro === 'QUAN_TRI' ? 'ADMIN' : user.chuTro ? 'LANDLORD' : 'TENANT';
    set({
      token,
      user,
      isAuthenticated: true,
      activeMode: mode,
      isLoading: false,
    });
  },

  setUser: (user) => set({ user }),

  // Nút chuyển đổi vai trò (chỉ dành cho Khách thuê <-> Chủ trọ, Admin không chuyển)
  switchMode: () => {
    const user = get().user;
    if (user?.vaiTro === 'QUAN_TRI') {
      return; // Admin chỉ dùng giao diện quản trị
    }
    const current = get().activeMode;
    const isChuTro = user?.chuTro;
    if (!isChuTro && current === 'TENANT') {
      alert('Bạn cần kích hoạt tài khoản Chủ trọ trước.');
      return;
    }
    set({ activeMode: current === 'TENANT' ? 'LANDLORD' : 'TENANT' });
  },

  // Đăng xuất -> Xoá token sạch sẽ
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

  // Kiểm tra token và định danh người dùng khi mở app
  checkAuth: async () => {
    try {
      const token = await tokenStorage.getToken();
      if (token) {
        try {
          const user = await authUserService.getMyProfile();
          const mode: AppMode = user.vaiTro === 'QUAN_TRI' ? 'ADMIN' : user.chuTro ? 'LANDLORD' : 'TENANT';
          set({
            token,
            user,
            isAuthenticated: true,
            activeMode: mode,
            isLoading: false,
          });
        } catch {
          await tokenStorage.removeToken();
          set({
            token: null,
            user: null,
            isAuthenticated: false,
            activeMode: 'TENANT',
            isLoading: false,
          });
        }
      } else {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          activeMode: 'TENANT',
          isLoading: false,
        });
      }
    } catch {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        activeMode: 'TENANT',
        isLoading: false,
      });
    }
  },
}));
