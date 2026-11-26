import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appointmentService } from '@/services/appointment.service';
import type { AppointmentResponse, TrangThaiDatLich } from '@/types/booking.types';

export type AppointmentFilterTab =
  | 'ALL'
  | 'CHO_XAC_NHAN'
  | 'XAC_NHAN'
  | 'HOAN_THANH'
  | 'HUY';

interface BookingState {
  appointments: AppointmentResponse[];
  isLoading: boolean;
  error: string | null;
  activeTab: AppointmentFilterTab;
  reviewedRoomIds: string[];
  paidAppointmentIds: string[];

  setActiveTab: (tab: AppointmentFilterTab) => void;
  resetBookingStore: () => void;
  fetchAppointments: (silent?: boolean) => Promise<void>;
  payAppointmentDeposit: (maDatLich: string) => Promise<{ success: boolean; message?: string }>;
  markRoomAsReviewed: (roomId: string) => void;
  cancelAppointment: (
    maDatLich: string,
    liDoHuy: string,
    bankInfo?: { tenNganHang?: string; soTaiKhoan?: string; tenChuTaiKhoan?: string },
  ) => Promise<{ success: boolean; message?: string }>;
  confirmReceivedDeposit: (
    maDatLich: string,
  ) => Promise<{ success: boolean; message?: string }>;
  submitCustomerDecision: (
    maDatLich: string,
    dongY: boolean,
    liDoTuChoi?: string,
  ) => Promise<{
    success: boolean;
    isCompleted?: boolean;
    trangThai?: string;
    liDoHuy?: string;
    message?: string;
  }>;
  reportLandlordNoShow: (
    maDatLich: string,
  ) => Promise<{ success: boolean; message?: string }>;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      appointments: [],
      isLoading: false,
      error: null,
      activeTab: 'ALL',
      reviewedRoomIds: [],
      paidAppointmentIds: [],

      setActiveTab: (tab) => set({ activeTab: tab }),

      resetBookingStore: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('innfinder_booking_storage');
        }
        set({
          appointments: [],
          isLoading: false,
          error: null,
          activeTab: 'ALL',
          reviewedRoomIds: [],
          paidAppointmentIds: [],
        });
      },

      fetchAppointments: async (silent = false) => {
        if (!silent) {
          set({ isLoading: true, error: null });
        }
        try {
          const data = await appointmentService.getMyAppointments();
          const list = Array.isArray(data) ? data : [];
          const backendPaidIds = list
            .filter((item) => item.daNopCoc)
            .map((item) => item.maDatLich);

          set({
            appointments: list,
            paidAppointmentIds: backendPaidIds,
            isLoading: false,
          });
        } catch (err: unknown) {
          if (silent) return;
          const message =
            err instanceof Error ? err.message : 'Không thể tải danh sách lịch hẹn';
          set({
            appointments: [],
            error: message,
            isLoading: false,
          });
        }
      },

      payAppointmentDeposit: async (maDatLich: string) => {
        try {
          await appointmentService.payDeposit(maDatLich);
          const nextPaid = Array.from(new Set([...get().paidAppointmentIds, maDatLich]));
          set((state) => ({
            paidAppointmentIds: nextPaid,
            appointments: state.appointments.map((item) =>
              item.maDatLich === maDatLich ? { ...item, daNopCoc: true } : item,
            ),
          }));
          return { success: true };
        } catch (err: unknown) {
          return {
            success: false,
            message: err instanceof Error ? err.message : 'Thanh toán tiền cọc thất bại',
          };
        }
      },

      markRoomAsReviewed: (roomId: string) => {
        const nextReviewed = Array.from(new Set([...get().reviewedRoomIds, roomId]));
        set({ reviewedRoomIds: nextReviewed });
      },

      cancelAppointment: async (
        maDatLich: string,
        liDoHuy: string,
        bankInfo?: { tenNganHang?: string; soTaiKhoan?: string; tenChuTaiKhoan?: string },
      ) => {
        try {
          await appointmentService.cancelAppointment(maDatLich, liDoHuy, bankInfo);
          const remainingPaid = get().paidAppointmentIds.filter((id) => id !== maDatLich);
          set((state) => ({
            paidAppointmentIds: remainingPaid,
            appointments: state.appointments.map((item) =>
              item.maDatLich === maDatLich
                ? { ...item, trangThai: 'HUY' as TrangThaiDatLich, liDoHuy }
                : item,
            ),
          }));
          return { success: true };
        } catch (err: unknown) {
          return {
            success: false,
            message: err instanceof Error ? err.message : 'Hủy lịch hẹn không thành công',
          };
        }
      },

      confirmReceivedDeposit: async (maDatLich: string) => {
        try {
          const updated = await appointmentService.confirmReceivedDeposit(maDatLich);
          set((state) => ({
            appointments: state.appointments.map((item) =>
              item.maDatLich === maDatLich
                ? { ...item, ...updated, daNhanLaiCoc: true }
                : item,
            ),
          }));
          return { success: true };
        } catch (err: unknown) {
          return {
            success: false,
            message: err instanceof Error ? err.message : 'Xác nhận nhận lại cọc thất bại',
          };
        }
      },

      submitCustomerDecision: async (
        maDatLich: string,
        dongY: boolean,
        liDoTuChoi?: string,
      ) => {
        try {
          const updated = await appointmentService.submitCustomerDecision(
            maDatLich,
            dongY,
            liDoTuChoi,
          );
          const isCompleted = updated.trangThai === 'HOAN_THANH';
          set((state) => ({
            appointments: state.appointments.map((item) =>
              item.maDatLich === maDatLich
                ? {
                    ...item,
                    khachHangDongY: dongY,
                    chuTroDongY: updated.chuTroDongY ?? item.chuTroDongY,
                    trangThai: updated.trangThai || item.trangThai,
                    liDoHuy: updated.liDoHuy || item.liDoHuy,
                  }
                : item,
            ),
          }));
          return {
            success: true,
            isCompleted,
            trangThai: updated.trangThai,
            liDoHuy: updated.liDoHuy,
          };
        } catch (err: unknown) {
          return {
            success: false,
            message: err instanceof Error ? err.message : 'Gửi quyết định thuê thất bại',
          };
        }
      },

      reportLandlordNoShow: async (maDatLich: string) => {
        try {
          await appointmentService.reportLandlordNoShow(maDatLich);
          await get().fetchAppointments(true);
          return { success: true };
        } catch (err: unknown) {
          return {
            success: false,
            message: err instanceof Error ? err.message : 'Báo cáo chủ trọ vắng mặt thất bại',
          };
        }
      },
    }),
    {
      name: 'innfinder_booking_storage',
      partialize: (state) => ({
        reviewedRoomIds: state.reviewedRoomIds,
        paidAppointmentIds: state.paidAppointmentIds,
      }),
    },
  ),
);
