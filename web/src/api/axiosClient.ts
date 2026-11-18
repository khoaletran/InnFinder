import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "../types/api.types";
import { getDevAuthToken } from "./devAuth";

export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TOKEN_KEY = "innfinder_jwt_token";

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 1. Request Interceptor: Tự động gắn Bearer Token
axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Trong môi trường dev, devAuth sẽ tự động login hoặc đọc token từ .env.local/localStorage
      const token = await getDevAuthToken(BASE_URL);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("[AxiosClient] Lỗi đọc JWT token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Bóc tách ApiResponse<T> & Chuẩn hóa thông báo lỗi
axiosClient.interceptors.response.use(
  (response) => {
    // Backend trả về ApiResponse<T>
    const resData: ApiResponse<any> = response.data;
    if (resData && typeof resData.success === "boolean") {
      if (!resData.success) {
        return Promise.reject(new Error(resData.message || "Yêu cầu thất bại"));
      }
      return resData.data;
    }
    return response.data;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    let errorMessage = "Lỗi kết nối máy chủ, vui lòng thử lại sau.";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return Promise.reject(new Error(errorMessage));
  },
);

// Helper lưu & xóa token thủ công (sử dụng khi cần)
export const tokenStorage = {
  saveToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  removeToken: () => localStorage.removeItem(TOKEN_KEY),
};
