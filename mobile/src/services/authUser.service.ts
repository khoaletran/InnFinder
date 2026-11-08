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
  getMyProfile: async () => {
    const res = await axiosClient.get<any, UserProfileResponse>('/api/users/profile');
    if (res && res.hinhDaiDien && !res.avatarUrl) {
      res.avatarUrl = res.hinhDaiDien;
    }
    return res;
  },

  updateProfile: async (data: UpdateProfileRequest) => {
    const payload = {
      ...data,
      hinhDaiDien: data.hinhDaiDien || data.avatarUrl,
    };
    const res = await axiosClient.put<any, UserProfileResponse>('/api/users/profile', payload);
    if (res && res.hinhDaiDien && !res.avatarUrl) {
      res.avatarUrl = res.hinhDaiDien;
    }
    return res;
  },

  changePassword: (data: ChangePasswordRequest) => {
    return axiosClient.patch<any, string>('/api/users/change-password', data);
  },

  getMyBankAccounts: () => {
    return axiosClient.get<any, BankAccountResponse[]>('/api/users/bank-accounts');
  },

  upgradeToLandlord: (data: {
    cccd: string;
    anhCccdTruoc: string;
    anhCccdSau: string;
    tenNganHang: string;
    soTaiKhoan: string;
    tenChuTaiKhoan: string;
  }) => {
    return axiosClient.post<any, string>('/api/users/upgrade-to-landlord', data);
  },

  getMyLandlordRequest: () => {
    return axiosClient.get<any, any>('/api/users/my-landlord-request');
  },

  // 3. Khiếu nại (ComplaintController)
  createComplaint: (data: ComplaintRequestDTO) => {
    return axiosClient.post<any, any>('/api/complaints', data);
  },

  // 4. Lịch hẹn (AppointmentController)
  getMyAppointments: () => {
    return axiosClient.get<any, any[]>('/api/appointments/my-appointments');
  },
};
