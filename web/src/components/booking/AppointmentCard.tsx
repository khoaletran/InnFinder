import React from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Phone,
  Star,
  User,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useDepositCountdown } from '@/hooks/useDepositCountdown';
import { useBookingStore } from '@/store/useBookingStore';
import type { AppointmentResponse } from '@/types/booking.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

export interface AppointmentCardProps {
  item: AppointmentResponse;
  onCancel: (maDatLich: string) => void;
  isDepositPaid?: boolean;
  muted?: boolean;
}

const SHOPEE_STEPS = [
  { key: 'DAT_LICH', label: 'Đặt lịch' },
  { key: 'NOP_COC', label: 'Nộp cọc' },
  { key: 'XAC_NHAN', label: 'Chủ trọ duyệt' },
  { key: 'GAP_HOAN_COC', label: 'Hoàn cọc mặt' },
  { key: 'KET_QUA', label: 'Kết quả' },
] as const;

function getShopeeStepStatus(
  stepIdx: number,
  item: AppointmentResponse,
  isDepositPaid: boolean,
): 'completed' | 'active' | 'pending' | 'canceled' {
  if (item.trangThai === 'HUY') {
    if (stepIdx === 4) return 'canceled';
    if (stepIdx === 0) return 'completed';
    if (stepIdx === 1) return isDepositPaid ? 'completed' : 'pending';
    return 'pending';
  }

  if (item.trangThai === 'HOAN_THANH') {
    return 'completed';
  }

  if (item.trangThai === 'XAC_NHAN') {
    if (stepIdx <= 2) return 'completed';
    if (stepIdx === 3) return item.daNhanLaiCoc ? 'completed' : 'active';
    return 'pending';
  }

  // CHO_XAC_NHAN
  if (stepIdx === 0) return 'completed';
  if (stepIdx === 1) return isDepositPaid ? 'completed' : 'active';
  if (stepIdx === 2) return isDepositPaid ? 'active' : 'pending';
  return 'pending';
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  item,
  onCancel,
  isDepositPaid = false,
  muted = false,
}) => {
  const navigate = useNavigate();

  const formatAppointmentDateTime = (isoString?: string) => {
    if (!isoString) return '--/--/---- · --:--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} · ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  const fullStr = formatAppointmentDateTime(item.ngayHen);
  const canCancel =
    (item.trangThai === 'CHO_XAC_NHAN' || item.trangThai === 'XAC_NHAN') && !item.daNhanLaiCoc;
  const hasUnpaidDeposit = (item.coc ?? 0) > 0 && !item.daNopCoc && !isDepositPaid;
  const fetchAppointments = useBookingStore((s) => s.fetchAppointments);
  const countdown = useDepositCountdown({
    thoiGianDat: item.thoiGianDat,
    enabled: hasUnpaidDeposit && item.trangThai === 'CHO_XAC_NHAN',
    onExpire: () => {
      void fetchAppointments(true);
    },
  });

  const displayImage =
    item.hinhAnh ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';

  const detailRoute = `/appointments/${item.maDatLich}`;
  const depositRoute = `/appointments/deposit/${item.maDatLich}`;
  const reviewRoute = `/reviews/create/${item.maPhongTro}?roomTitle=${encodeURIComponent(
    item.tieuDePhong || '',
  )}&roomAddress=${encodeURIComponent(
    item.diaChiPhong || '',
  )}&roomImage=${encodeURIComponent(item.hinhAnh || '')}`;

  return (
    <div
      onClick={() => navigate(detailRoute)}
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 cursor-pointer space-y-4 ${
        muted ? 'opacity-80 hover:opacity-100' : ''
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Ảnh + Thông tin phòng */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <img
            src={displayImage}
            alt={item.tieuDePhong || item.maPhongTro}
            className="w-20 h-20 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={item.trangThai}
                label={
                  item.trangThai === 'CHO_XAC_NHAN'
                    ? hasUnpaidDeposit
                      ? 'Chờ nộp cọc'
                      : 'Chờ chủ trọ duyệt'
                    : undefined
                }
                pulse={item.trangThai === 'CHO_XAC_NHAN'}
              />
              <span className="text-xs font-mono font-semibold text-slate-600">
                #{item.maDatLich}
              </span>
            </div>

            <Link
              to={detailRoute}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-slate-900 text-base hover:text-teal-700 transition-colors line-clamp-1 block"
            >
              {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
            </Link>

            <p className="text-sm text-slate-600 line-clamp-1">
              {item.diaChiPhong || 'Địa chỉ đang cập nhật'}
            </p>
          </div>
        </div>

        {/* Ngày giờ + Chủ trọ */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-6 shrink-0">
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-0.5">
              Lịch hẹn xem
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-sm whitespace-nowrap">
              <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
              <span>{fullStr}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-0.5">
              {item.tenChuTro ? `Chủ trọ ${item.tenChuTro}` : 'Chủ trọ'}
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm whitespace-nowrap">
              {item.sdtChuTro ? (
                <>
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{formatPhoneNumber(item.sdtChuTro)}</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Đang cập nhật</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động: 1 Primary chính theo trạng thái + Hủy lịch dạng chữ */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100"
        >
          {canCancel && (
            <AppButton
              variant="ghost"
              size="sm"
              onClick={() => onCancel(item.maDatLich)}
            >
              Hủy lịch
            </AppButton>
          )}

          {hasUnpaidDeposit && canCancel ? (
            <AppButton
              variant="primary"
              size="md"
              onClick={() =>
                navigate(depositRoute, {
                  state: {
                    roomId: item.maPhongTro,
                    roomTitle: item.tieuDePhong,
                    roomImage: item.hinhAnh,
                    depositAmount: item.coc,
                    ngayHen: item.ngayHen,
                  },
                })
              }
            >
              <CreditCard className="w-4 h-4" />
              <span>Nộp cọc</span>
            </AppButton>
          ) : item.trangThai === 'HOAN_THANH' ? (
            <AppButton
              variant="primary"
              size="md"
              onClick={() => navigate(reviewRoute)}
            >
              <Star className="w-4 h-4" />
              <span>Đánh giá</span>
            </AppButton>
          ) : item.trangThai === 'XAC_NHAN' || item.trangThai === 'CHO_XAC_NHAN' ? (
            <AppButton
              variant="primary"
              size="md"
              onClick={() => navigate(detailRoute)}
            >
              <span>Xem chi tiết</span>
            </AppButton>
          ) : (
            <AppButton
              variant="secondary"
              size="md"
              onClick={() => navigate(detailRoute)}
            >
              <span>Xem chi tiết</span>
            </AppButton>
          )}
        </div>
      </div>

      {/* Thanh tiến trình Shopee cho từng phiếu hẹn */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          {SHOPEE_STEPS.map((step, idx) => {
            const status = getShopeeStepStatus(idx, item, !hasUnpaidDeposit);
            const isCompleted = status === 'completed';
            const isActive = status === 'active';
            const isCanceled = status === 'canceled';

            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-teal-600 text-white'
                        : isActive
                          ? 'bg-teal-50 text-teal-800 border-2 border-teal-600 ring-2 ring-teal-100'
                          : isCanceled
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : isCanceled ? (
                      <X className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span
                    className={`text-xs ${
                      isCompleted
                        ? 'font-bold text-teal-800'
                        : isActive
                          ? 'font-bold text-slate-900'
                          : isCanceled
                            ? 'font-bold text-rose-600'
                            : 'font-medium text-slate-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < SHOPEE_STEPS.length - 1 && (
                  <span
                    className={`w-4 h-0.5 shrink-0 rounded-full transition-colors ${
                      isCompleted ? 'bg-teal-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {hasUnpaidDeposit && item.trangThai === 'CHO_XAC_NHAN' && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Cần nộp cọc giữ chân: {formatVND(item.coc)}</span>
            </span>
            {countdown.formattedTime && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold">
                <Clock className="w-3 h-3 text-rose-600" />
                <span>
                  {countdown.isExpired ? 'Hết hạn (00:00)' : `Còn ${countdown.formattedTime}`}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCard;
