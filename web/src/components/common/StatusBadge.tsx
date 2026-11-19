import React from 'react';
import type { TrangThaiDatLich } from '@/types/booking.types';
import type { TrangThaiGD } from '@/types/transaction.types';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusSpec {
  label: string;
  tone: BadgeTone;
}

const TONE_CLASSES: Record<
  BadgeTone,
  { container: string; dot: string }
> = {
  success: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-600',
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-600',
  },
  info: {
    container: 'bg-blue-50 text-blue-800 border-blue-200',
    dot: 'bg-blue-600',
  },
  neutral: {
    container: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
};

const APPOINTMENT_STATUS_MAP: Record<TrangThaiDatLich, StatusSpec> = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', tone: 'warning' },
  XAC_NHAN: { label: 'Đã xác nhận', tone: 'info' },
  HOAN_THANH: { label: 'Hoàn tất', tone: 'success' },
  HUY: { label: 'Đã hủy', tone: 'danger' },
};

const TRANSACTION_STATUS_MAP: Record<TrangThaiGD, StatusSpec> = {
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', tone: 'warning' },
  THANH_CONG: { label: 'Thành công', tone: 'success' },
  HOAN_TIEN: { label: 'Hoàn tiền', tone: 'info' },
  THAT_BAI: { label: 'Thất bại', tone: 'danger' },
};

interface StatusBadgeProps {
  status?: string;
  label?: string;
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  tone,
  pulse = false,
  className = '',
}) => {
  const mapped =
    (status && APPOINTMENT_STATUS_MAP[status as TrangThaiDatLich]) ||
    (status && TRANSACTION_STATUS_MAP[status as TrangThaiGD]);

  const resolvedLabel = label || mapped?.label || status || 'Không rõ';
  const resolvedTone: BadgeTone = tone || mapped?.tone || 'neutral';
  const styles = TONE_CLASSES[resolvedTone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${styles.container} ${className}`.trim()}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot} ${pulse ? 'animate-pulse' : ''}`}
      />
      <span>{resolvedLabel}</span>
    </span>
  );
};
