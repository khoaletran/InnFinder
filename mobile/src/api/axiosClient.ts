import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { ApiResponse } from "../types/api.types";

// LƯU Ý KHI TEST:
// - Nếu chạy máy ảo Android: dùng 'http://10.0.2.2:8080'
// - Nếu chạy trên điện thoại thật qua Expo Go: thay bằng IP mạng LAN máy tính của bạn (VD: 'http://192.168.1.15:8080')
const BASE_URL = "http://192.168.0.41:8080";
const TOKEN_KEY = "innfinder_jwt_token";

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 1. Request Interceptor: Tự động gắn Token nếu người dùng đã đăng nhập
axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Lỗi đọc token từ SecureStore:", error);
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

// Helper lưu & xóa token
export const tokenStorage = {
  saveToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  removeToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
