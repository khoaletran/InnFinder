import { axiosClient } from "../api/axiosClient";
import {
  AppointmentCancelRequest,
  AppointmentCreateRequest,
  AppointmentResponse,
  ReviewRequestDTO,
  TransactionResponse,
} from "../types/booking.types";

export const bookingService = {
  /**
   * Lay danh sach lich hen xem phong cua khach dang dang nhap
   * Endpoint: GET /api/appointments/my-appointments
   */
  getMyAppointments: async (): Promise<AppointmentResponse[]> => {
    return axiosClient.get<any, AppointmentResponse[]>(
      "/api/appointments/my-appointments",
    );
  },

  /**
   * Khach dat lich xem phong moi
   * Endpoint: POST /api/appointments
   */
  createAppointment: async (
    request: AppointmentCreateRequest,
  ): Promise<AppointmentResponse> => {
    return axiosClient.post<any, AppointmentResponse>(
      "/api/appointments",
      request,
    );
  },

  /**
   * Khach huy lich hen kem ly do
   * Endpoint: PATCH /api/appointments/{id}/cancel
   */
  cancelAppointment: async (
    maDatLich: string,
    liDoHuy: string,
  ): Promise<string> => {
    const body: AppointmentCancelRequest = { liDoHuy };
    return axiosClient.patch<any, string>(
      `/api/appointments/${maDatLich}/cancel`,
      body,
    );
  },

  /**
   * Lay lich su giao dich vi / coc cua khach
   * Endpoint: GET /api/transactions/my-history
   */
  getMyTransactions: async (): Promise<TransactionResponse[]> => {
    return axiosClient.get<any, TransactionResponse[]>(
      "/api/transactions/my-history",
    );
  },

  /**
   * Gui danh gia chat luong phong sau khi xem
   * Endpoint: POST /api/rooms/{roomId}/reviews
   */
  createReview: async (
    roomId: string,
    data: ReviewRequestDTO,
  ): Promise<any> => {
    return axiosClient.post<any, any>(`/api/rooms/${roomId}/reviews`, data);
  },
  // Lấy danh sách đánh giá của phòng để tìm đánh giá của chính mình
  getRoomReviews: async (roomId: string): Promise<any[]> => {
    return axiosClient.get<any, any[]>(`/api/rooms/${roomId}/reviews`);
  },
};
