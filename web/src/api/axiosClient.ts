import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types/api.types';
import { useAuthStore } from '@/store/useAuthStore';

export const BASE_URL = import.meta.env.VITE_API_URL || 'https://extrude-chug-shorthand.ngrok-free.dev';
const TOKEN_KEY = 'innfinder_jwt_token';

export const tokenStorage = {
  saveToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
};

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

// 1. Request Interceptor: Tự động gắn Bearer JWT từ useAuthStore (hoặc tokenStorage khi vừa login)
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const storeToken = useAuthStore.getState().token;
      const token = storeToken || tokenStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Lỗi đọc token xác thực:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Bóc tách ApiResponse<T> & xử lý đồng bộ 401
axiosClient.interceptors.response.use(
  (response) => {
    const resData: ApiResponse<unknown> = response.data;
    if (resData && typeof resData.success === 'boolean') {
      if (!resData.success) {
        return Promise.reject(new Error(resData.message || 'Yêu cầu thất bại'));
      }
      return resData.data as never;
    }
    return response.data;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    let errorMessage = 'Lỗi kết nối máy chủ, vui lòng thử lại sau.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Yêu cầu quá thời gian chờ. Vui lòng thử lại sau.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  },
);
