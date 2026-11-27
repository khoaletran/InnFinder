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
    coords: { viDo: number; kinhDo: number },
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

      // Khi polling ngầm: Tận dụng cache RAM để không truy xuất Keychain/ổ đĩa liên tục
      let parsedReviewed = get().reviewedRoomIds;
      let parsedPaid = get().paidAppointmentIds;
      let balance = get().walletBalance;

      if (!silent) {
        try {
          const storedReviewed = await SecureStore.getItemAsync(REVIEWED_STORAGE_KEY);
          if (storedReviewed) parsedReviewed = JSON.parse(storedReviewed);

          const storedPaid = await SecureStore.getItemAsync(PAID_APPOINTMENTS_KEY);
          if (storedPaid) parsedPaid = JSON.parse(storedPaid);

          const storedBalance = await SecureStore.getItemAsync(WALLET_BALANCE_KEY);
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
        // Trong chế độ silent polling ngầm, nếu mạng chập chờn thì không xoá dữ liệu hiện tại
        return;
      }
      set({
        appointments: [],
        error: isAuthError
          ? null
          : err.response?.data?.message ||
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

  // Hủy lịch hẹn hoặc từ chối thuê sau khi xem thực tế
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

  // Khách hàng xác nhận thuê phòng (Kịch bản 1: CẢ 2 BÊN CÙNG BẤM XÁC NHẬN THUÊ)
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
      await SecureStore.setItemAsync(
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

  // Khách hàng xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực
  confirmReceivedDeposit: async (
    maDatLich: string,
    coords: { viDo: number; kinhDo: number },
  ) => {
    try {
      const updated = await bookingService.confirmReceivedDeposit(maDatLich, coords);
      set((state) => ({
        appointments: state.appointments.map((item) =>
          item.maDatLich === maDatLich
            ? { ...item, ...updated, daNhanLaiCoc: true }
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

  // Khách hàng đưa ra quyết định độc lập (Thuê / Không thuê)
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
