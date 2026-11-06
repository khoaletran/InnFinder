import { create } from "zustand";
import { bookingService } from "../services/booking.service";
import { AppointmentResponse, TrangThaiDatLich } from "../types/booking.types";

export type AppointmentFilterTab =
  | "ALL"
  | "CHO_XAC_NHAN"
  | "XAC_NHAN"
  | "HOAN_THANH";

interface BookingState {
  appointments: AppointmentResponse[];
  isLoading: boolean;
  error: string | null;
  activeTab: AppointmentFilterTab;

  setActiveTab: (tab: AppointmentFilterTab) => void;
  fetchAppointments: () => Promise<void>;
  cancelAppointment: (
    maDatLich: string,
    liDoHuy: string,
  ) => Promise<{ success: boolean; message?: string }>;
}

export const useBookingStore = create<BookingState>((set) => ({
  appointments: [],
  isLoading: false,
  error: null,
  activeTab: "ALL",

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Gọi API lấy danh sách lịch hẹn của tôi
  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bookingService.getMyAppointments();
      set({ appointments: data || [], isLoading: false });
    } catch (err: any) {
      set({
        appointments: [],
        error:
          err.response?.data?.message ||
          err.message ||
          "Không thể tải lịch hẹn",
        isLoading: false,
      });
    }
  },

  // Gọi API hủy lịch hẹn và trả về thông điệp lỗi nếu có
  cancelAppointment: async (maDatLich: string, liDoHuy: string) => {
    try {
      await bookingService.cancelAppointment(maDatLich, liDoHuy);
      // Cập nhật state trực tiếp
      set((state) => ({
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich
            ? { ...item, trangThai: "HUY" as TrangThaiDatLich, liDoHuy }
            : item,
        ),
      }));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message:
          err.response?.data?.message ||
          err.message ||
          "Hủy lịch hẹn không thành công",
      };
    }
  },
}));
