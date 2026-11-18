import React from "react";
import { Link } from "react-router-dom";
import type { AppointmentResponse, TrangThaiDatLich } from "../../types/booking.types";
import { formatVNDShort } from "../../utils/formatVND";

export interface RentalRequestCardProps {
  item: AppointmentResponse;
}

// Cấu hình Badge trạng thái theo thiết kế mockup
const STATUS_BADGES: Record<
  TrangThaiDatLich,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  CHO_XAC_NHAN: {
    label: "Chờ phản hồi",
    textClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
  },
  XAC_NHAN: {
    label: "Đang xử lý",
    textClass: "text-blue-700",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
  },
  HOAN_THANH: {
    label: "Đã chấp nhận",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
  },
  HUY: {
    label: "Đã hủy",
    textClass: "text-rose-600",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
  },
};

export const RentalRequestCard: React.FC<RentalRequestCardProps> = ({ item }) => {
  // Format ngày gửi (thời gian đặt)
  const formatSentDate = (isoStr?: string) => {
    if (!isoStr) return "26/09/2026 · 20:14";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} · ${hours}:${minutes}`;
    } catch {
      return isoStr;
    }
  };

  // Format ngày nhận dự kiến
  const formatExpectedDate = (isoStr?: string) => {
    if (!isoStr) return "05/10/2026";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  const badge = STATUS_BADGES[item.trangThai] || {
    label: item.trangThai,
    textClass: "text-slate-600",
    bgClass: "bg-slate-50",
    borderClass: "border-slate-200",
  };

  const displayImage =
    item.hinhAnh ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400";

  const displayTitle =
    item.tieuDePhong || `Phòng trọ mã #${item.maPhongTro}`;

  const displayPrice = item.giaThue
    ? formatVNDShort(item.giaThue)
    : "4,2 triệu/tháng";

  const sentTimeStr = formatSentDate(item.thoiGianDat || item.ngayHen);
  const expectedDateStr = formatExpectedDate(item.ngayHen);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        {/* Hàng 1: Ảnh + Tiêu đề + Giá + Badge */}
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
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                {displayPrice}
              </p>
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

        {/* Hàng 2: Bảng 4 thông số cốt lõi */}
        <div className="grid grid-cols-4 gap-2 bg-slate-50/80 rounded-xl p-3 mt-4 border border-slate-100 text-center">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Ngày nhận dự kiến
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
              {expectedDateStr}
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Thời gian thuê
            </span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">
              12 tháng
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Số người
            </span>
            <span className="text-xs font-bold text-slate-800 mt-1 block">
              2 người
            </span>
          </div>

          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Ghi chú
            </span>
            <span className="text-xs text-slate-600 line-clamp-1 mt-1 block" title={item.diaChiPhong || "Nhận phòng buổi chiều"}>
              {item.diaChiPhong ? "Theo hẹn" : "Nhận buổi chiều"}
            </span>
          </div>
        </div>
      </div>

      {/* Hàng 3: Cụm nút hành động */}
      <div className="flex items-center justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
        {/* Nút Liên hệ */}
        <a
          href={`tel:${item.sdtChuTro || "0903456789"}`}
          className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
        >
          Liên hệ
        </a>

        {/* Nút Xem chi tiết */}
        <Link
          to={`/booking/rental/${item.maDatLich}`}
          className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
        >
          Xem chi tiết
        </Link>
      </div>
    </div>
  );
};

export default RentalRequestCard;
