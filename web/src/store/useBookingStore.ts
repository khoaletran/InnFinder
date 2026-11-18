import { create } from "zustand";
import { bookingService } from "../services/booking.service";
import type { AppointmentResponse, TrangThaiDatLich } from "../types/booking.types";

const REVIEWED_STORAGE_KEY = "innfinder_reviewed_room_ids";
const PAID_APPOINTMENTS_KEY = "innfinder_paid_appointment_ids";
const WALLET_BALANCE_KEY = "innfinder_wallet_balance";
const DEFAULT_WALLET_BALANCE = 2000000; // Số dư ví mẫu 2.000.000 đ để test

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
  fetchAppointments: (silent?: boolean) => Promise<void>;
  markRoomAsReviewed: (roomId: string) => Promise<void>;
  cancelAppointment: (
    maDatLich: string,
    liDoHuy: string,
  ) => Promise<{ success: boolean; message?: string }>;
  confirmRental: (
    maDatLich: string,
  ) => Promise<{ success: boolean; message?: string }>;
  confirmReceivedDeposit: (
    maDatLich: string,
  ) => Promise<{ success: boolean; message?: string }>;
  submitCustomerDecision: (
    maDatLich: string,
    dongY: boolean,
    liDoTuChoi?: string,
  ) => Promise<{ success: boolean; isCompleted?: boolean; message?: string }>;
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

  fetchAppointments: async (silent = false) => {
    if (!silent) {
      set({ isLoading: true, error: null });
    }
    try {
      const data = await bookingService.getMyAppointments();

      let parsedReviewed = get().reviewedRoomIds;
      let parsedPaid = get().paidAppointmentIds;
      let balance = get().walletBalance;

      if (!silent) {
        try {
          const storedReviewed = localStorage.getItem(REVIEWED_STORAGE_KEY);
          if (storedReviewed) parsedReviewed = JSON.parse(storedReviewed);

          const storedPaid = localStorage.getItem(PAID_APPOINTMENTS_KEY);
          if (storedPaid) parsedPaid = JSON.parse(storedPaid);

          const storedBalance = localStorage.getItem(WALLET_BALANCE_KEY);
          if (storedBalance !== null) balance = Number(storedBalance);
        } catch {
          // Bỏ qua lỗi đọc bộ nhớ cục bộ
        }
      }

      // Đồng bộ thêm các lịch hẹn mà backend trả về cờ daNopCoc = true
      const backendPaidIds = (data || [])
        .filter((item) => item.daNopCoc)
        .map((item) => item.maDatLich);
      const mergedPaid = Array.from(new Set([...parsedPaid, ...backendPaidIds]));

      set({
        appointments: data || [],
        reviewedRoomIds: parsedReviewed,
        paidAppointmentIds: mergedPaid,
        walletBalance: balance,
        isLoading: false,
      });
    } catch (err: any) {
      const isAuthError =
        err.response?.status === 401 || err.response?.status === 403;
      if (silent) {
        return;
      }
      set({
        appointments: [],
        error: isAuthError
          ? null
          : err.response?.data?.message ||
            err.message ||
            "Không thể tải danh sách lịch hẹn",
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
    localStorage.setItem(WALLET_BALANCE_KEY, String(newBalance));
    return true;
  },

  // Hoàn tiền cọc vào ví
  refundWallet: async (amount: number) => {
    const newBalance = get().walletBalance + amount;
    set({ walletBalance: newBalance });
    localStorage.setItem(WALLET_BALANCE_KEY, String(newBalance));
  },

  // Nạp tiền ví
  topUpWallet: async (amount: number) => {
    const newBalance = get().walletBalance + amount;
    set({ walletBalance: newBalance });
    localStorage.setItem(WALLET_BALANCE_KEY, String(newBalance));
  },

  // Nộp tiền cọc giữ chân
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

      await bookingService.payDeposit(maDatLich);

      const nextPaid = Array.from(
        new Set([...get().paidAppointmentIds, maDatLich]),
      );
      set((state) => ({
        paidAppointmentIds: nextPaid,
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich ? { ...item, daNopCoc: true } : item,
        ),
      }));
      localStorage.setItem(PAID_APPOINTMENTS_KEY, JSON.stringify(nextPaid));
      return true;
    } catch {
      return false;
    }
  },

  markRoomAsReviewed: async (roomId: string) => {
    const nextReviewed = Array.from(
      new Set([...get().reviewedRoomIds, roomId]),
    );
    set({ reviewedRoomIds: nextReviewed });
    localStorage.setItem(
      REVIEWED_STORAGE_KEY,
      JSON.stringify(nextReviewed),
    );
  },

  // Hủy lịch hẹn
  cancelAppointment: async (maDatLich: string, liDoHuy: string) => {
    try {
      await bookingService.cancelAppointment(maDatLich, liDoHuy);
      const target = get().appointments.find((a) => a.maDatLich === maDatLich);
      const wasPaid =
        !!target?.daNopCoc || get().paidAppointmentIds.includes(maDatLich);
      if (wasPaid && target?.coc) {
        await get().refundWallet(target.coc);
      }
      const remainingPaid = get().paidAppointmentIds.filter(
        (id) => id !== maDatLich,
      );
      if (remainingPaid.length !== get().paidAppointmentIds.length) {
        set({ paidAppointmentIds: remainingPaid });
        localStorage.setItem(
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

  // Khách hàng xác nhận thuê phòng (Legacy)
  confirmRental: async (maDatLich: string) => {
    try {
      await bookingService.confirmRental(maDatLich);
      const target = get().appointments.find((a) => a.maDatLich === maDatLich);
      const wasPaid =
        !!target?.daNopCoc || get().paidAppointmentIds.includes(maDatLich);
      if (wasPaid && target?.coc) {
        await get().refundWallet(target.coc);
      }
      const remainingPaid = get().paidAppointmentIds.filter(
        (id) => id !== maDatLich,
      );
      set({
        paidAppointmentIds: remainingPaid,
        appointments: get().appointments.map((item) =>
          item.maDatLich === maDatLich
            ? { ...item, trangThai: "HOAN_THANH" as TrangThaiDatLich }
            : item,
        ),
      });
      localStorage.setItem(
        PAID_APPOINTMENTS_KEY,
        JSON.stringify(remainingPaid),
      );
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message:
          err.response?.data?.message ||
          err.message ||
          "Xác nhận thuê phòng thất bại",
      };
    }
  },

  // Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực (Bước 3 Swimlane)
  confirmReceivedDeposit: async (maDatLich: string) => {
    try {
      await bookingService.confirmReceivedDeposit(maDatLich);
      set((state) => ({
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich
            ? { ...item, daNhanLaiCoc: true }
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
          "Xác nhận nhận lại cọc thất bại",
      };
    }
  },

  // Khách hàng đưa ra quyết định độc lập (Bước 4 Swimlane)
  submitCustomerDecision: async (
    maDatLich: string,
    dongY: boolean,
    liDoTuChoi?: string,
  ) => {
    try {
      const updated = await bookingService.submitCustomerDecision(
        maDatLich,
        dongY,
        liDoTuChoi,
      );
      const isCompleted = updated.trangThai === "HOAN_THANH";
      set((state) => ({
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich
            ? {
                ...item,
                khachHangDongY: dongY,
                trangThai: updated.trangThai || item.trangThai,
                liDoHuy: updated.liDoHuy || item.liDoHuy,
              }
            : item,
        ),
      }));
      return { success: true, isCompleted };
    } catch (err: any) {
      return {
        success: false,
        message:
          err.response?.data?.message ||
          err.message ||
          "Gửi quyết định thất bại",
      };
    }
  },
}));
