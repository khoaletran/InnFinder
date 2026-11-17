import { axiosClient } from '../api/axiosClient';
import type {
  AuthResponse,
  BankAccountResponse,
  ChangePasswordRequest,
  ComplaintRequestDTO,
  ComplaintResponseDTO,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpgradeLandlordRequest,
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
  getMyProfile: async (): Promise<UserProfileResponse> => {
    const res = await axiosClient.get<any, UserProfileResponse>('/api/users/profile');
    if (res && res.hinhDaiDien && !res.avatarUrl) {
      res.avatarUrl = res.hinhDaiDien;
    }
    return res;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfileResponse> => {
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

  getMyBankAccounts: (): Promise<BankAccountResponse[]> => {
    return axiosClient.get<any, BankAccountResponse[]>('/api/users/bank-accounts');
  },

  addBankAccount: (data: { soTaiKhoan: string; tenNganHang: string; tenChuTaiKhoan?: string }) => {
    return axiosClient.post<any, BankAccountResponse>('/api/users/bank-accounts', data);
  },

  upgradeToLandlord: (data: UpgradeLandlordRequest) => {
    return axiosClient.post<any, string>('/api/users/upgrade-to-landlord', data);
  },

  getMyLandlordRequest: () => {
    return axiosClient.get<any, any>('/api/users/my-landlord-request');
  },

  // 3. Khiếu nại (ComplaintController)
  createComplaint: (data: ComplaintRequestDTO) => {
    return axiosClient.post<any, ComplaintResponseDTO>('/api/complaints', data);
  },

  getMyComplaints: (): Promise<ComplaintResponseDTO[]> => {
    return axiosClient.get<any, ComplaintResponseDTO[]>('/api/complaints/my-complaints');
  },
};
