import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types/api.types';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'innfinder_jwt_token';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

// 1. Request Interceptor: Tự động gắn Token nếu người dùng đã đăng nhập
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Lỗi đọc token từ localStorage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Bóc tách ApiResponse<T> & Chuẩn hóa thông báo lỗi
axiosClient.interceptors.response.use(
  (response) => {
    const resData: ApiResponse<any> = response.data;
    if (resData && typeof resData.success === 'boolean') {
      if (!resData.success) {
        return Promise.reject(new Error(resData.message || 'Yêu cầu thất bại'));
      }
      return resData.data;
    }
    return response.data;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    let errorMessage = 'Lỗi kết nối máy chủ, vui lòng thử lại sau.';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  },
);

export const tokenStorage = {
  saveToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
};
