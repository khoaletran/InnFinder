import React from 'react';
import { AlertCircle, Check, Clock } from 'lucide-react';
import type { TrangThaiDatLich } from '@/types/booking.types';

export interface RentalProgressBarProps {
  status: TrangThaiDatLich;
  sentDate?: string;
}

export const RentalProgressBar: React.FC<RentalProgressBarProps> = ({
  status,
  sentDate = '--/--',
}) => {
  const steps = [
    { label: 'Đã gửi lịch', date: sentDate },
    { label: 'Chủ trọ xác nhận', date: sentDate },
    { label: 'Xem phòng & nhận cọc', date: 'Đang xử lý' },
    { label: 'Quyết định 2 bên', date: 'Hoàn tất' },
  ];

  const getStepStatus = (index: number) => {
    if (status === 'HUY') {
      if (index === 0) return 'completed';
      if (index === 1) return 'cancelled';
      return 'upcoming';
    }
    if (status === 'HOAN_THANH') return 'completed';
    if (status === 'XAC_NHAN') {
      if (index <= 2) return 'completed';
      return 'current';
    }
    if (index === 0) return 'completed';
    if (index === 1) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-full py-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-slate-200 -z-0" />

        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(idx);

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
                {stepStatus === 'completed'
                  ? step.date
                  : stepStatus === 'current'
                    ? 'Hiện tại'
                    : '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RentalProgressBar;
