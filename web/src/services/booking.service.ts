import { axiosClient } from "../api/axiosClient";
import type {
  AppointmentCancelRequest,
  AppointmentCreateRequest,
  AppointmentResponse,
  ReviewRequestDTO,
  TransactionResponse,
} from "../types/booking.types";

export const bookingService = {
  /**
   * Lấy danh sách lịch hẹn xem phòng của khách đang đăng nhập
   * Endpoint: GET /api/appointments/my-appointments
   */
  getMyAppointments: async (): Promise<AppointmentResponse[]> => {
    return axiosClient.get<any, AppointmentResponse[]>(
      "/api/appointments/my-appointments",
    );
  },

  /**
   * Khách đặt lịch xem phòng mới
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
   * Khách nộp tiền cọc giữ chân sau khi chủ trọ đã xác nhận lịch hẹn
   * Endpoint: POST /api/appointments/{id}/pay-deposit
   */
  payDeposit: async (maDatLich: string): Promise<string> => {
    return axiosClient.post<any, string>(
      `/api/appointments/${maDatLich}/pay-deposit`,
    );
  },

  /**
   * Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực (Bước 3 Swimlane)
   * Endpoint: PATCH /api/appointments/{id}/confirm-received-deposit
   */
  confirmReceivedDeposit: async (maDatLich: string): Promise<AppointmentResponse> => {
    return axiosClient.patch<any, AppointmentResponse>(
      `/api/appointments/${maDatLich}/confirm-received-deposit`
    );
  },

  /**
   * Khách hàng đưa ra quyết định độc lập (Thuê / Không thuê) (Bước 4 Swimlane)
   * Endpoint: PATCH /api/appointments/{id}/decision
   */
  submitCustomerDecision: async (
    maDatLich: string,
    dongY: boolean,
    liDoTuChoi?: string
  ): Promise<AppointmentResponse> => {
    return axiosClient.patch<any, AppointmentResponse>(
      `/api/appointments/${maDatLich}/decision`,
      { dongY, liDoTuChoi }
    );
  },

  /**
   * Khách hàng xác nhận thuê phòng sau khi xem thực tế (Legacy)
   * Endpoint: PATCH /api/appointments/{id}/confirm-rental
   */
  confirmRental: async (maDatLich: string): Promise<string> => {
    return axiosClient.patch<any, string>(
      `/api/appointments/${maDatLich}/confirm-rental`,
    );
  },

  /**
   * Khách hủy lịch hẹn kèm lý do
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
   * Lấy lịch sử giao dịch ví / cọc của khách
   * Endpoint: GET /api/transactions/my-history
   */
  getMyTransactions: async (): Promise<TransactionResponse[]> => {
    return axiosClient.get<any, TransactionResponse[]>(
      "/api/transactions/my-history",
    );
  },

  /**
   * Gửi đánh giá chất lượng phòng sau khi xem
   * Endpoint: POST /api/rooms/{roomId}/reviews
   */
  createReview: async (
    roomId: string,
    data: ReviewRequestDTO,
  ): Promise<any> => {
    return axiosClient.post<any, any>(`/api/rooms/${roomId}/reviews`, data);
  },

  /**
   * Lấy danh sách đánh giá của phòng
   * Endpoint: GET /api/rooms/{roomId}/reviews
   */
  getRoomReviews: async (roomId: string): Promise<any[]> => {
    return axiosClient.get<any, any[]>(`/api/rooms/${roomId}/reviews`);
  },
};
