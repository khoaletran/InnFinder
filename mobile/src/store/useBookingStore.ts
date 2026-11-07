import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { bookingService } from "../services/booking.service";
import { AppointmentResponse, TrangThaiDatLich } from "../types/booking.types";

const REVIEWED_STORAGE_KEY = "innfinder_reviewed_room_ids";
const PAID_APPOINTMENTS_KEY = "innfinder_paid_appointment_ids";
const WALLET_BALANCE_KEY = "innfinder_wallet_balance";
const DEFAULT_WALLET_BALANCE = 2000000; // Số dư ban đầu 2 triệu để test

export type AppointmentFilterTab =
  | "ALL"
  | "CHO_XAC_NHAN"
  | "XAC_NHAN"
  | "HOAN_THANH"
  | "HUY";

interface BookingState {
  appointments: AppointmentResponse[];
  isLoading: boolean;
  error: string | null;
  activeTab: AppointmentFilterTab;
  reviewedRoomIds: string[]; // Danh sách mã phòng đã đánh giá
  paidAppointmentIds: string[]; // Danh sách mã lịch hẹn đã nộp cọc giữ chân

  // Quản lý số dư Ví Khách hàng
  walletBalance: number;
  deductWallet: (amount: number) => Promise<boolean>;
  refundWallet: (amount: number) => Promise<void>;
  topUpWallet: (amount: number) => Promise<void>;
  payAppointmentDeposit: (
    maDatLich: string,
    amount: number,
    method: string,
  ) => Promise<boolean>;

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
  paidAppointmentIds: [],
  walletBalance: DEFAULT_WALLET_BALANCE,

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await bookingService.getMyAppointments();

      // Đọc danh sách phòng đã đánh giá đã lưu trong máy
      const storedReviewed =
        await SecureStore.getItemAsync(REVIEWED_STORAGE_KEY);
      const parsedReviewed = storedReviewed ? JSON.parse(storedReviewed) : [];

      // Đọc danh sách lịch hẹn đã nộp cọc giữ chân từ cache cục bộ
      const storedPaid = await SecureStore.getItemAsync(PAID_APPOINTMENTS_KEY);
      const parsedPaid: string[] = storedPaid ? JSON.parse(storedPaid) : [];

      // Đồng bộ thêm các lịch hẹn mà backend trả về cờ daNopCoc = true
      const backendPaidIds = (data || [])
        .filter((item) => item.daNopCoc)
        .map((item) => item.maDatLich);
      const mergedPaid = Array.from(new Set([...parsedPaid, ...backendPaidIds]));

      // Đọc số dư ví đã lưu trong máy
      const storedBalance = await SecureStore.getItemAsync(WALLET_BALANCE_KEY);
      const balance =
        storedBalance !== null ? Number(storedBalance) : DEFAULT_WALLET_BALANCE;

      set({
        appointments: data || [],
        reviewedRoomIds: parsedReviewed,
        paidAppointmentIds: mergedPaid,
        walletBalance: balance,
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

  // Trừ tiền ví khi nộp cọc
  deductWallet: async (amount: number) => {
    const current = get().walletBalance;
    if (current < amount) return false;

    const newBalance = current - amount;
    set({ walletBalance: newBalance });
    await SecureStore.setItemAsync(WALLET_BALANCE_KEY, String(newBalance));
    return true;
  },

  // Hoàn tiền cọc vào ví khi xem phòng xong hoặc hủy
  refundWallet: async (amount: number) => {
    const newBalance = get().walletBalance + amount;
    set({ walletBalance: newBalance });
    await SecureStore.setItemAsync(WALLET_BALANCE_KEY, String(newBalance));
  },

  // Nạp thêm tiền để test thoải mái nếu hết số dư
  topUpWallet: async (amount: number) => {
    const newBalance = get().walletBalance + amount;
    set({ walletBalance: newBalance });
    await SecureStore.setItemAsync(WALLET_BALANCE_KEY, String(newBalance));
  },

  // Nộp tiền cọc giữ chân cho lịch hẹn đã được duyệt
  payAppointmentDeposit: async (
    maDatLich: string,
    amount: number,
    method: string,
  ) => {
    try {
      if (method === "WALLET") {
        const ok = await get().deductWallet(amount);
        if (!ok) return false;
      }
      // Gọi API backend ghi nhận nộp cọc vào CSDL
      try {
        await bookingService.payDeposit(maDatLich);
      } catch (apiErr) {
        console.warn("Lỗi API payDeposit từ backend (tiếp tục lưu state):", apiErr);
      }

      const current = get().paidAppointmentIds;
      if (!current.includes(maDatLich)) {
        const updated = [...current, maDatLich];
        set({
          paidAppointmentIds: updated,
          appointments: get().appointments.map((a) =>
            a.maDatLich === maDatLich ? { ...a, daNopCoc: true } : a,
          ),
        });
        await SecureStore.setItemAsync(
          PAID_APPOINTMENTS_KEY,
          JSON.stringify(updated),
        );
      }
      return true;
    } catch (e) {
      console.warn("Lỗi payAppointmentDeposit:", e);
      return false;
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
      const wasPaid = get().paidAppointmentIds.includes(maDatLich);
      if (wasPaid) {
        const remainingPaid = get().paidAppointmentIds.filter(
          (id) => id !== maDatLich,
        );
        set({ paidAppointmentIds: remainingPaid });
        await SecureStore.setItemAsync(
          PAID_APPOINTMENTS_KEY,
          JSON.stringify(remainingPaid),
        );
      }
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
