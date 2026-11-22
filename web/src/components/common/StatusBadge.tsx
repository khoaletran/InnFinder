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
    container: 'bg-success-bg text-success-text',
    dot: 'bg-success-text',
  },
  warning: {
    container: 'bg-warning-bg text-warning-text',
    dot: 'bg-warning-text',
  },
  danger: {
    container: 'bg-danger-bg text-danger-text',
    dot: 'bg-danger-text',
  },
  info: {
    container: 'bg-info-bg text-info-text',
    dot: 'bg-info-text',
  },
  neutral: {
    container: 'bg-surface-muted text-text-secondary',
    dot: 'bg-text-muted',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium whitespace-nowrap ${styles.container} ${className}`.trim()}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      <span>{resolvedLabel}</span>
    </span>
  );
};
