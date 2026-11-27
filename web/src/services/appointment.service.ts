import { axiosClient } from '@/api/axiosClient';
import type {
  AppointmentCancelRequest,
  AppointmentCreateRequest,
  AppointmentDecisionRequest,
  AppointmentResponse,
  BookedSlotsResponse,
  DepositStatusResponse,
} from '@/types/booking.types';

export const appointmentService = {
  getBookedSlots: async (maPhongTro: string, date: string): Promise<BookedSlotsResponse> => {
    return axiosClient.get<unknown, BookedSlotsResponse>('/api/appointments/booked-slots', {
      params: { maPhongTro, date },
    });
  },

  getMyAppointments: async (): Promise<AppointmentResponse[]> => {
    return axiosClient.get<unknown, AppointmentResponse[]>('/api/appointments/my-appointments');
  },

  getDepositStatus: async (maDatLich: string): Promise<DepositStatusResponse> => {
    return axiosClient.get<unknown, DepositStatusResponse>(
      `/api/appointments/${maDatLich}/deposit-status`,
    );
  },

  createAppointment: async (request: AppointmentCreateRequest): Promise<AppointmentResponse> => {
    return axiosClient.post<unknown, AppointmentResponse>('/api/appointments', request);
  },

  payDeposit: async (maDatLich: string): Promise<string> => {
    return axiosClient.post<unknown, string>(`/api/appointments/${maDatLich}/pay-deposit`);
  },

  confirmReceivedDeposit: async (
    maDatLich: string,
    coords: { viDo: number; kinhDo: number },
  ): Promise<AppointmentResponse> => {
    return axiosClient.patch<unknown, AppointmentResponse>(
      `/api/appointments/${maDatLich}/confirm-received-deposit`,
      coords,
    );
  },

  submitCustomerDecision: async (
    maDatLich: string,
    dongY: boolean,
    liDoTuChoi?: string,
  ): Promise<AppointmentResponse> => {
    const body: AppointmentDecisionRequest = { dongY, liDoTuChoi };
    return axiosClient.patch<unknown, AppointmentResponse>(
      `/api/appointments/${maDatLich}/decision`,
      body,
    );
  },

  cancelAppointment: async (
    maDatLich: string,
    liDoHuy: string,
    bankInfo?: { tenNganHang?: string; soTaiKhoan?: string; tenChuTaiKhoan?: string }
  ): Promise<string> => {
    const body: AppointmentCancelRequest = {
      liDoHuy,
      tenNganHang: bankInfo?.tenNganHang,
      soTaiKhoan: bankInfo?.soTaiKhoan,
      tenChuTaiKhoan: bankInfo?.tenChuTaiKhoan,
    };
    return axiosClient.patch<unknown, string>(`/api/appointments/${maDatLich}/cancel`, body);
  },

  reportLandlordNoShow: async (maDatLich: string): Promise<string> => {
    return axiosClient.post<unknown, string>(`/api/appointments/${maDatLich}/report-landlord-noshow`);
  },
};

export default appointmentService;
