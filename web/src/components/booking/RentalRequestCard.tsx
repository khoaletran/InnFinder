import React from 'react';
import { Link } from 'react-router-dom';
import type { AppointmentResponse, TrangThaiDatLich } from '@/types/booking.types';
import { formatDate, formatDateTime, formatVND, formatVNDShort } from '@/utils/formatters';

export interface RentalRequestCardProps {
  item: AppointmentResponse;
}

const STATUS_BADGES: Record<
  TrangThaiDatLich,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  CHO_XAC_NHAN: {
    label: 'Chờ phản hồi',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  XAC_NHAN: {
    label: 'Đang xử lý',
    textClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
  },
  HOAN_THANH: {
    label: 'Thuê thành công',
    textClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
  },
  HUY: {
    label: 'Đã hủy',
    textClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
  },
};

export const RentalRequestCard: React.FC<RentalRequestCardProps> = ({ item }) => {
  const badge = STATUS_BADGES[item.trangThai] || {
    label: item.trangThai,
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
  };

  const displayImage =
    item.hinhAnh ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400';

  const displayTitle = item.tieuDePhong || `Phòng trọ mã #${item.maPhongTro}`;
  const displayPrice = item.giaThue ? formatVNDShort(item.giaThue) : 'Thỏa thuận';
  const sentTimeStr = formatDateTime(item.thoiGianDat || item.ngayHen);
  const expectedDateStr = formatDate(item.ngayHen);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200/60"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-sm truncate" title={displayTitle}>
                {displayTitle}
              </h3>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{displayPrice}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                Gửi {sentTimeStr}
              </span>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 bg-slate-50/80 rounded-xl p-3 mt-4 border border-slate-100 text-center">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Ngày hẹn xem
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
              {expectedDateStr}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Cọc lịch xem
            </span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">
              {formatVND(item.coc)}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Hoàn cọc mặt
            </span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">
              {item.daNhanLaiCoc ? 'Đã nhận lại' : 'Chưa nhận'}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Quyết định
            </span>
            <span
              className="text-xs text-slate-600 line-clamp-1 mt-1 block"
              title={item.diaChiPhong || ''}
            >
              {item.trangThai === 'HOAN_THANH'
                ? '2 bên đồng ý'
                : item.trangThai === 'HUY'
                  ? 'Đã hủy'
                  : 'Đang chờ'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
        {item.sdtChuTro && (
          <a
            href={`tel:${item.sdtChuTro}`}
            className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
          >
            Liên hệ
          </a>
        )}

        <Link
          to={`/appointments/${item.maDatLich}`}
          className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
        >
          Xem chi tiết
        </Link>
      </div>
    </div>
  );
};

export default RentalRequestCard;
