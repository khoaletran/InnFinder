import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { bookingService } from "../services/booking.service";
import { AppointmentResponse, TrangThaiDatLich } from "../types/booking.types";

const REVIEWED_STORAGE_KEY = "innfinder_reviewed_room_ids";

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
  reviewedRoomIds: string[]; // Danh sách mã phòng đã đánh giá

  setActiveTab: (tab: AppointmentFilterTab) => void;
  fetchAppointments: () => Promise<void>;
  markRoomAsReviewed: (roomId: string) => Promise<void>;
  cancelAppointment: (
    maDatLich: string,
    liDoHuy: string,
  ) => Promise<{ success: boolean; message?: string }>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  appointments: [],
  isLoading: false,
  error: null,
  activeTab: "ALL",
  reviewedRoomIds: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bookingService.getMyAppointments();

      // Đọc danh sách phòng đã đánh giá đã lưu trong máy
      const storedReviewed =
        await SecureStore.getItemAsync(REVIEWED_STORAGE_KEY);
      const parsedReviewed = storedReviewed ? JSON.parse(storedReviewed) : [];

      set({
        appointments: data || [],
        reviewedRoomIds: parsedReviewed,
        isLoading: false,
      });
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

  // Đánh dấu phòng đã gửi review
  markRoomAsReviewed: async (roomId: string) => {
    const current = get().reviewedRoomIds;
    if (!current.includes(roomId)) {
      const updated = [...current, roomId];
      set({ reviewedRoomIds: updated });
      await SecureStore.setItemAsync(
        REVIEWED_STORAGE_KEY,
        JSON.stringify(updated),
      );
    }
  },

  cancelAppointment: async (maDatLich: string, liDoHuy: string) => {
    try {
      await bookingService.cancelAppointment(maDatLich, liDoHuy);
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
