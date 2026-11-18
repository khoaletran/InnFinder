import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Phone,
  Star,
  User,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AppointmentResponse, TrangThaiDatLich } from '@/types/booking.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

export interface AppointmentCardProps {
  item: AppointmentResponse;
  onCancel: (maDatLich: string) => void;
  isDepositPaid?: boolean;
}

const STATUS_CONFIG: Record<
  TrangThaiDatLich,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  CHO_XAC_NHAN: {
    label: 'Chờ xác nhận',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  XAC_NHAN: {
    label: 'Đã xác nhận',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  HOAN_THANH: {
    label: 'Hoàn tất',
    textClass: 'text-teal-700',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
  },
  HUY: {
    label: 'Đã hủy',
    textClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
};

const getCancelByText = (liDoHuy?: string): string => {
  if (!liDoHuy) return 'Đã hủy';
  const lower = liDoHuy.toLowerCase().trim();
  if (
    lower.startsWith('chủ trọ') ||
    lower.includes('chủ trọ từ chối') ||
    lower.includes('chủ trọ hủy')
  ) {
    return 'Chủ trọ hủy';
  }
  if (
    lower.startsWith('khách hàng') ||
    lower.includes('khách hàng không thuê') ||
    lower.includes('khách hàng hủy')
  ) {
    return 'Khách hàng hủy';
  }
  if (lower.includes('hệ thống') || lower.includes('hết hạn')) {
    return 'Hệ thống hủy';
  }
  if (liDoHuy.includes(':')) {
    const actor = liDoHuy.split(':')[0].trim();
    if (actor) return actor;
  }
  return 'Đã hủy';
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  item,
  onCancel,
  isDepositPaid = false,
}) => {
  const navigate = useNavigate();

  const formatAppointmentDateTime = (isoString?: string) => {
    if (!isoString) return { dateStr: '--/--/----', timeStr: '--:--', fullStr: '--/--/---- · --:--' };
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) {
        return { dateStr: isoString, timeStr: '', fullStr: isoString };
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return {
        dateStr: `${day}/${month}/${year}`,
        timeStr: `${hours}:${minutes}`,
        fullStr: `${day}/${month}/${year} · ${hours}:${minutes}`,
      };
    } catch {
      return { dateStr: isoString, timeStr: '', fullStr: isoString };
    }
  };

  const { fullStr } = formatAppointmentDateTime(item.ngayHen);
  const statusInfo = STATUS_CONFIG[item.trangThai] || {
    label: item.trangThai,
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
  };

  const canCancel =
    item.trangThai === 'CHO_XAC_NHAN' || item.trangThai === 'XAC_NHAN';

  const hasUnpaidDeposit =
    (item.coc ?? 0) > 0 && !item.daNopCoc && !isDepositPaid;

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
      className="bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0 py-4 px-4 sm:px-6 cursor-pointer"
    >
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(240px,1fr)_165px_165px_140px_204px] lg:items-center gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={displayImage}
            alt={item.tieuDePhong || item.maPhongTro}
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60"
          />
          <div className="min-w-0 flex-1">
            <Link
              to={detailRoute}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors line-clamp-1 block"
              title={item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
            >
              {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
            </Link>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {item.diaChiPhong || 'Địa chỉ đang cập nhật'}
            </p>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
              Mã lịch: #{item.maDatLich}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Ngày · Giờ
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm font-mono whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{fullStr}</span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm font-mono whitespace-nowrap">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatPhoneNumber(item.sdtChuTro)}</span>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              {item.tenChuTro ? `Chủ trọ ${item.tenChuTro}` : 'Chủ trọ'}
            </span>
          </span>
        </div>

        <div className="min-w-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
            >
              {item.trangThai === 'CHO_XAC_NHAN' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
              {item.trangThai === 'XAC_NHAN' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
              {item.trangThai === 'HOAN_THANH' && (
                <CheckCircle2 className="w-3 h-3 text-teal-600" />
              )}
              {item.trangThai === 'HUY' && (
                <XCircle className="w-3 h-3 text-rose-500" />
              )}
              {statusInfo.label}
            </span>
          </div>

          {hasUnpaidDeposit && item.trangThai !== 'HUY' && (
            <span className="text-[11px] text-amber-600 font-medium flex items-center justify-center gap-1 mt-1 text-center">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Chưa nộp cọc ({formatVND(item.coc)})
            </span>
          )}

          {item.trangThai === 'HUY' && (
            <span
              className="text-[11px] text-rose-500 font-medium text-center mt-1 block truncate max-w-full"
              title={item.liDoHuy}
            >
              {getCancelByText(item.liDoHuy)}
            </span>
          )}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[204px] shrink-0 flex items-center justify-end gap-2"
        >
          {hasUnpaidDeposit && canCancel ? (
            <>
              <button
                type="button"
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
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-full transition-colors gap-1 shadow-xs cursor-pointer shrink-0"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Nộp cọc</span>
              </button>

              <button
                type="button"
                onClick={() => onCancel(item.maDatLich)}
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-full transition-colors cursor-pointer shrink-0"
              >
                Hủy lịch
              </button>
            </>
          ) : item.trangThai === 'HOAN_THANH' ? (
            <>
              <Link
                to={detailRoute}
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-full transition-colors cursor-pointer shrink-0"
              >
                Xem chi tiết
              </Link>
              <Link
                to={reviewRoute}
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors gap-1 cursor-pointer shrink-0"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Đánh giá</span>
              </Link>
            </>
          ) : canCancel ? (
            <>
              <Link
                to={detailRoute}
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-full transition-colors cursor-pointer shrink-0"
              >
                Xem chi tiết
              </Link>
              <button
                type="button"
                onClick={() => onCancel(item.maDatLich)}
                className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-full transition-colors cursor-pointer shrink-0"
              >
                Hủy lịch
              </button>
            </>
          ) : (
            <Link
              to={detailRoute}
              className="w-[98px] h-[34px] flex items-center justify-center text-center text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-full transition-colors cursor-pointer shrink-0"
            >
              Xem chi tiết
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentCard;
