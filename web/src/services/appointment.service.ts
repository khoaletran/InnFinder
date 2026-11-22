import { axiosClient } from '@/api/axiosClient';
import type {
  AppointmentCancelRequest,
  AppointmentCreateRequest,
  AppointmentDecisionRequest,
  AppointmentResponse,
  DepositStatusResponse,
} from '@/types/booking.types';

export const appointmentService = {
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

  confirmReceivedDeposit: async (maDatLich: string): Promise<AppointmentResponse> => {
    return axiosClient.patch<unknown, AppointmentResponse>(
      `/api/appointments/${maDatLich}/confirm-received-deposit`,
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

  cancelAppointment: async (maDatLich: string, liDoHuy: string): Promise<string> => {
    const body: AppointmentCancelRequest = { liDoHuy };
    return axiosClient.patch<unknown, string>(`/api/appointments/${maDatLich}/cancel`, body);
  },
};

export default appointmentService;
