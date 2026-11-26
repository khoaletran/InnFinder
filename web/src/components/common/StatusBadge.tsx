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
  HOAN_TIEN: { label: 'Đã hoàn tiền', tone: 'info' },
  THAT_BAI: { label: 'Thất bại', tone: 'danger' },
};

interface StatusBadgeProps {
  status?: string;
  type?: string;
  label?: string;
  tone?: BadgeTone;
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type,
  label,
  tone,
  className = '',
}) => {
  const mapped =
    (status && APPOINTMENT_STATUS_MAP[status as TrangThaiDatLich]) ||
    (status && TRANSACTION_STATUS_MAP[status as TrangThaiGD]);

  // Đặc tả nghiệp vụ: Nếu là giao dịch HOAN_COC đang ở trạng thái CHO_THANH_TOAN,
  // hiển thị nhãn thân thiện "Đang hoàn cọc" thay vì "Chờ thanh toán"
  let resolvedLabel = label || mapped?.label || status || 'Không rõ';
  let resolvedTone: BadgeTone = tone || mapped?.tone || 'neutral';

  if (status === 'CHO_THANH_TOAN' && type === 'HOAN_COC') {
    resolvedLabel = 'Đang hoàn cọc';
    resolvedTone = 'info';
  } else if (status === 'CHO_THANH_TOAN' && (type === 'RUT_TIEN' || type === 'YEU_CAU_RUT_TIEN')) {
    resolvedLabel = 'Chờ duyệt rút tiền';
    resolvedTone = 'warning';
  }

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
