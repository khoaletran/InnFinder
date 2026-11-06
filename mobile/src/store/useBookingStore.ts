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
  cancelAppointment: (maDatLich: string, liDoHuy: string) => Promise<boolean>;
}

export const useBookingStore = create<BookingState>((set) => ({
  appointments: [],
  isLoading: false,
  error: null,
  activeTab: "ALL",

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Gọi 100% API thật từ Backend
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

  // Gọi API hủy lịch thật: PATCH /api/appointments/{id}/cancel
  cancelAppointment: async (maDatLich: string, liDoHuy: string) => {
    try {
      await bookingService.cancelAppointment(maDatLich, liDoHuy);
      // Cập nhật trạng thái trực tiếp trên local state sau khi API thành công
      set((state) => ({
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich
            ? { ...item, trangThai: "HUY" as TrangThaiDatLich, liDoHuy }
            : item,
        ),
      }));
      return true;
    } catch {
      return false;
    }
  },
}));
