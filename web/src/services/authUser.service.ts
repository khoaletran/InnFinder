import { axiosClient } from '@/api/axiosClient';
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
} from '@/types/auth-user.types';

export const authUserService = {
  register: (data: RegisterRequest) => {
    return axiosClient.post<unknown, string>('/api/auth/register', data);
  },

  login: (data: LoginRequest) => {
    return axiosClient.post<unknown, AuthResponse>('/api/auth/login', data);
  },

  getMyProfile: async (): Promise<UserProfileResponse> => {
    const res = await axiosClient.get<unknown, UserProfileResponse>('/api/users/profile');
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
    const res = await axiosClient.put<unknown, UserProfileResponse>('/api/users/profile', payload);
    if (res && res.hinhDaiDien && !res.avatarUrl) {
      res.avatarUrl = res.hinhDaiDien;
    }
    return res;
  },

  changePassword: (data: ChangePasswordRequest) => {
    return axiosClient.patch<unknown, string>('/api/users/change-password', data);
  },

  getMyBankAccounts: (): Promise<BankAccountResponse[]> => {
    return axiosClient.get<unknown, BankAccountResponse[]>('/api/users/bank-accounts');
  },

  addBankAccount: (data: {
    soTaiKhoan: string;
    tenNganHang: string;
    tenChuTaiKhoan?: string;
  }) => {
    return axiosClient.post<unknown, BankAccountResponse>('/api/users/bank-accounts', data);
  },

  deleteBankAccount: (id: number) => {
    return axiosClient.delete<unknown, void>(`/api/users/bank-accounts/${id}`);
  },

  upgradeToLandlord: (data: UpgradeLandlordRequest) => {
    return axiosClient.post<unknown, string>('/api/users/upgrade-to-landlord', data);
  },

  getMyLandlordRequest: () => {
    return axiosClient.get<unknown, Record<string, unknown> | null>(
      '/api/users/my-landlord-request',
    );
  },

  createComplaint: (data: ComplaintRequestDTO) => {
    return axiosClient.post<unknown, ComplaintResponseDTO>('/api/complaints', data);
  },

  getMyComplaints: (type: 'RECEIVED' | 'SENT' = 'SENT'): Promise<ComplaintResponseDTO[]> => {
    return axiosClient.get<unknown, ComplaintResponseDTO[]>('/api/complaints/my-complaints', {
      params: { type },
    });
  },
};
