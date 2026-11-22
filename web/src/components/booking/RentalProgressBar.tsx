import React from 'react';
import { AlertCircle, Check, Clock } from 'lucide-react';
import type { TrangThaiDatLich } from '@/types/booking.types';

export interface RentalProgressBarProps {
  status: TrangThaiDatLich;
  sentDate?: string;
  daNhanLaiCoc?: boolean;
  daNopCoc?: boolean;
  khachHangDongY?: boolean | null;
  chuTroDongY?: boolean | null;
}

export const RentalProgressBar: React.FC<RentalProgressBarProps> = ({
  status,
  sentDate = '--/--',
  daNhanLaiCoc = false,
  daNopCoc = false,
  khachHangDongY = null,
  chuTroDongY = null,
}) => {
  const getStepStatus = (index: number): 'completed' | 'current' | 'cancelled' | 'upcoming' => {
    // 1. Trường hợp đơn bị hủy
    if (status === 'HUY') {
      if (index === 0) return 'completed';
      if (daNopCoc && index === 1) return 'completed';
      if (daNhanLaiCoc && index <= 3) return 'completed';
      if (index === (daNhanLaiCoc ? 4 : daNopCoc ? 2 : 1)) return 'cancelled';
      return 'upcoming';
    }

    // 2. Trường hợp hoàn tất (cả 2 bên cùng chốt thuê)
    if (status === 'HOAN_THANH') {
      return 'completed';
    }

    // 3. Trường hợp mới tạo lịch hẹn, chờ chủ trọ xác nhận
    if (status === 'CHO_XAC_NHAN') {
      if (index === 0) return 'completed';
      if (index === 1) return daNopCoc ? 'completed' : 'current';
      if (index === 2) return daNopCoc ? 'current' : 'upcoming';
      return 'upcoming';
    }

    // 4. Trường hợp chủ trọ đã xác nhận lịch (XAC_NHAN)
    if (status === 'XAC_NHAN') {
      if (index <= 2) return 'completed'; // Đã gửi lịch, đã nộp cọc & Chủ trọ đã xác nhận

      // Kiểm tra bước 3: Xem phòng & hoàn cọc trực tiếp
      if (!daNhanLaiCoc) {
        if (index === 3) return 'current'; // Đang diễn ra bước gặp xem phòng & nhận lại cọc
        return 'upcoming'; // Bước 4 (Quyết định 2 bên) đang khóa
      }

      // Khi đã nhận lại cọc (daNhanLaiCoc === true)
      if (index === 3) return 'completed'; // Bước 3 đã xong
      if (index === 4) return 'current';   // Bước 4 đang mở khóa để 2 bên đưa ra quyết định
      return 'upcoming';
    }

    return 'upcoming';
  };

  const getStepSubtext = (
    index: number,
    stepStatus: 'completed' | 'current' | 'cancelled' | 'upcoming',
  ): string => {
    if (stepStatus === 'cancelled') return 'Đã dừng';
    if (stepStatus === 'completed') {
      if (index === 0) return sentDate;
      if (index === 1) return 'Đã nộp cọc';
      if (index === 2) return 'Đã duyệt';
      if (index === 3) return 'Đã nhận cọc';
      if (index === 4) return 'Đã chốt thuê';
      return 'Hoàn tất';
    }
    if (stepStatus === 'current') {
      if (index === 1) return 'Chờ nộp cọc';
      if (index === 2) return 'Chờ chủ trọ';
      if (index === 3) return 'Chờ xem phòng';
      if (index === 4) {
        if (khachHangDongY === true && chuTroDongY === null) return 'Chờ chủ trọ';
        if (chuTroDongY === true && khachHangDongY === null) return 'Chờ khách thuê';
        return 'Chờ quyết định';
      }
      return 'Hiện tại';
    }
    if (index === 4) return 'Chờ mở khóa';
    return '--';
  };

  const steps = [
    { label: 'Gửi yêu cầu' },
    { label: 'Nộp cọc' },
    { label: 'Chủ trọ duyệt' },
    { label: 'Xem & nhận cọc' },
    { label: 'Quyết định' },
  ];

  return (
    <div className="w-full py-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(idx);
          const subtext = getStepSubtext(idx, stepStatus);

          return (
            <div key={idx} className="flex flex-col items-center text-center z-10 px-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  stepStatus === 'completed'
                    ? 'bg-emerald-500 text-white border-2 border-white ring-2 ring-emerald-500/20'
                    : stepStatus === 'current'
                      ? 'bg-teal-600 text-white border-2 border-white ring-2 ring-blue-500/20 animate-pulse'
                      : stepStatus === 'cancelled'
                        ? 'bg-rose-500 text-white border-2 border-white'
                        : 'bg-slate-100 text-slate-400 border-2 border-white'
                }`}
              >
                {stepStatus === 'completed' ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : stepStatus === 'current' ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : stepStatus === 'cancelled' ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}
              </div>

              <span
                className={`text-xs mt-2 font-medium line-clamp-1 ${
                  stepStatus === 'completed'
                    ? 'text-slate-800 font-semibold'
                    : stepStatus === 'current'
                      ? 'text-teal-600 font-bold'
                      : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {subtext}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RentalProgressBar;
