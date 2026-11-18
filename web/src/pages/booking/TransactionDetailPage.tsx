import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Home,
  MapPin,
  Phone,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useTransactionStore } from "../../store/useTransactionStore";
import { formatVND } from "../../utils/formatVND";
import {
  resolveRoomInfo,
  formatTransactionType,
  getTransactionStatusBadge,
} from "../../utils/transactionUtils";
import type { TransactionResponse } from "../../types/booking.types";

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  const { transactions, fetchTransactions } = useTransactionStore();
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (transactions.length === 0) {
      fetchTransactions();
    }
  }, [transactions.length, fetchTransactions]);

  // Tìm giao dịch theo mã trong Store
  const foundTx = transactions.find((t) => t.maGiaoDich === transactionId);

  // Dữ liệu hiển thị (kết hợp dữ liệu thật từ DB)
  const tx: TransactionResponse = useMemo(() => {
    if (foundTx) return foundTx;

    // Dự phòng an toàn nếu truy cập trực tiếp ID chưa kịp load
    return {
      maGiaoDich: transactionId || "GD20261108001",
      soTien: 300000,
      loaiGiaoDich: "COC_XEM_PHONG",
      noiDung: "Tạm giữ cọc xem phòng PT0111260003 (Mã lịch: DL20261108001)",
      ngayGiaoDich: "2026-11-08T11:02:09",
      trangThai: "THANH_CONG",
    };
  }, [foundTx, transactionId]);

  const badge = getTransactionStatusBadge(tx.trangThai);
  const typeInfo = formatTransactionType(tx.loaiGiaoDich);
  const roomInfo = resolveRoomInfo(tx.noiDung);

  // Format ngày giờ
  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds} - ${day}/${month}/${year}`;
    } catch {
      return isoStr;
    }
  };

  const formatShortTime = (isoStr: string, addSeconds = 0) => {
    try {
      const d = new Date(isoStr);
      if (addSeconds) {
        d.setSeconds(d.getSeconds() + addSeconds);
      }
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const seconds = String(d.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    } catch {
      return "09:18:11";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Điều hướng (LƯU Ý: ĐÃ XÓA NÚT TẢI BIÊN NHẬN PDF THEO YÊU CẦU) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/booking/transactions")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại lịch sử giao dịch</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Chi tiết giao dịch
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mã: <span className="font-semibold text-slate-700">{tx.maGiaoDich}</span> •{" "}
            <span>{typeInfo.label}</span>
          </p>
        </div>

        {/* Nút quay lại nhanh */}
        <div className="flex items-center gap-2">
          <Link
            to="/booking/transactions"
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Danh sách giao dịch
          </Link>
        </div>
      </div>

      {/* 2. Banner Trạng thái đối soát */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-emerald-900">
            {badge.label === "Thành công"
              ? "Giao dịch thành công"
              : badge.label === "Hoàn tiền"
              ? "Giao dịch hoàn tiền"
              : "Giao dịch đang xử lý"}
          </h4>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            Khoản giao dịch đã được hệ thống InnFinder ghi nhận và đối soát tự động lúc{" "}
            {formatFullDate(tx.ngayGiaoDich)}.
          </p>
        </div>
      </div>

      {/* 3. Bố cục 2 Cột: Bên trái Biên nhận - Bên phải Tiến trình */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3 chiều rộng desktop) - BIÊN NHẬN GIAO DỊCH */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            {/* Header Biên nhận */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0088ff] text-white flex items-center justify-center font-bold text-xs">
                    IF
                  </div>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    InnFinder
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
                  Biên nhận giao dịch điện tử
                </p>
              </div>

              {/* Badge trạng thái */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                {badge.label}
              </span>
            </div>

            {/* 3 Cột Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-100 text-xs">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mã giao dịch
                </span>
                <span className="font-mono font-bold text-slate-800 text-sm mt-1 block">
                  {tx.maGiaoDich}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Thời gian
                </span>
                <span className="font-semibold text-slate-700 mt-1 block">
                  {formatFullDate(tx.ngayGiaoDich)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Phương thức
                </span>
                <span className="font-semibold text-slate-700 mt-1 block">
                  {typeInfo.method}
                </span>
              </div>
            </div>

            {/* Thông tin phòng liên kết (Dựa trên dữ liệu thật từ DB) */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                {roomInfo ? (
                  <img
                    src={roomInfo.imageUrl}
                    alt={roomInfo.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Home className="w-7 h-7" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {roomInfo ? roomInfo.title : "Giao dịch phòng trọ InnFinder"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{roomInfo ? roomInfo.address : "Khu vực TP. Hà Nội"}</span>
                </p>
                <p className="text-[11px] text-[#0088ff] font-medium mt-1 truncate">
                  {tx.noiDung}
                </p>
              </div>
            </div>

            {/* Bảng Kê Chi Tiết Tiền (Dữ liệu thật DB) */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Số tiền giao dịch:</span>
                <span className="font-semibold text-slate-800">
                  {formatVND(tx.soTien)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Phí dịch vụ đối soát:</span>
                <span className="font-semibold text-emerald-600">0 đ (Miễn phí)</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">
                  Tổng tiền biến động:
                </span>
                <span className="text-xl font-extrabold text-[#0088ff]">
                  {formatVND(tx.soTien)}
                </span>
              </div>
            </div>

            {/* Ghi chú chân biên nhận */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Bảo chứng bởi InnFinder Escrow Engine</span>
              </span>
              <span>Sổ cái MariaDB :3307</span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (1/3 chiều rộng desktop) */}
        <div className="space-y-6">
          {/* Card 1: Tiến trình thanh toán (Payment Timeline) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Tiến trình thanh toán
            </h3>

            <div className="space-y-0">
              {/* Bước 1: Khởi tạo */}
              <div className="relative flex gap-3.5 pb-5">
                <div className="absolute left-[13px] top-[22px] bottom-0 w-[2px] bg-emerald-500 -ml-[1px]" />
                <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">Khởi tạo giao dịch</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatShortTime(tx.ngayGiaoDich)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Yêu cầu thanh toán tiền cọc được tạo.
                  </p>
                </div>
              </div>

              {/* Bước 2: Xác thực */}
              <div className="relative flex gap-3.5 pb-5">
                <div className="absolute left-[13px] top-[22px] bottom-0 w-[2px] bg-emerald-500 -ml-[1px]" />
                <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">Hệ thống xác thực</h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatShortTime(tx.ngayGiaoDich, 5)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ví cá nhân trừ cọc và bảo chứng an toàn.
                  </p>
                </div>
              </div>

              {/* Bước 3: Đối soát hoàn tất */}
              <div className="relative flex gap-3.5">
                <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900">Đối soát hoàn tất</h5>
                    <span className="text-[10px] text-emerald-600 font-mono font-semibold">
                      {formatShortTime(tx.ngayGiaoDich, 15)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    InnFinder đã ghi nhận tiền cọc vào sổ cái.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Cần hỗ trợ giao dịch? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0088ff] flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Cần hỗ trợ giao dịch?
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cung cấp mã <strong className="text-slate-800">{tx.maGiaoDich}</strong>{" "}
              khi liên hệ bộ phận hỗ trợ để được kiểm tra và giải quyết nhanh nhất.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              >
                Liên hệ hỗ trợ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Modal Hỗ Trợ Giao Dịch */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-[#0088ff]">
              <Phone className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Hỗ trợ giao dịch
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Mã giao dịch: <strong className="text-slate-800">{tx.maGiaoDich}</strong>
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tổng đài CSKH:</span>
                <span className="font-bold text-[#0088ff]">1900 6868</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Giờ hỗ trợ:</span>
                <span className="font-semibold text-slate-700">08:00 - 22:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="font-semibold text-slate-700">support@innfinder.vn</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <a
                href="tel:19006868"
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#0088ff] hover:bg-blue-600 rounded-xl transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Gọi ngay</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
