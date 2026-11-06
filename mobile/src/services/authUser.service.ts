import { axiosClient } from '../api/axiosClient';
import {
  AuthResponse,
  BankAccountResponse,
  ChangePasswordRequest,
  ComplaintRequestDTO,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserProfileResponse,
} from '../types/auth-user.types';

export const authUserService = {
  // 1. Xác thực (AuthController)
  register: (data: RegisterRequest) => {
    return axiosClient.post<any, string>('/api/auth/register', data);
  },

  login: (data: LoginRequest) => {
    return axiosClient.post<any, AuthResponse>('/api/auth/login', data);
  },

  // 2. Hồ sơ cá nhân (UserController)
  getMyProfile: () => {
    return axiosClient.get<any, UserProfileResponse>('/api/users/profile');
  },

  updateProfile: (data: UpdateProfileRequest) => {
    return axiosClient.put<any, UserProfileResponse>('/api/users/profile', data);
  },

  changePassword: (data: ChangePasswordRequest) => {
    return axiosClient.patch<any, string>('/api/users/change-password', data);
  },

  getMyBankAccounts: () => {
    return axiosClient.get<any, BankAccountResponse[]>('/api/users/bank-accounts');
  },

  upgradeToLandlord: (data: { cccd: string; soTaiKhoan: string; tenNganHang: string }) => {
    return axiosClient.post<any, string>('/api/users/upgrade-to-landlord', data);
  },

  // 3. Khiếu nại (ComplaintController)
  createComplaint: (data: ComplaintRequestDTO) => {
    return axiosClient.post<any, any>('/api/complaints', data);
  },
};