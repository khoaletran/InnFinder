import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Home,
  Lock,
} from "lucide-react";
import { useBookingStore } from "../../store/useBookingStore";
import { RentalTimeline } from "../../components/booking/RentalTimeline";
import { DeclineReasonModal } from "../../components/booking/DeclineReasonModal";
import { formatVND, formatVNDShort } from "../../utils/formatVND";
import type { AppointmentResponse, TrangThaiDatLich } from "../../types/booking.types";

export const RentalDetailPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();

  const {
    appointments,
    fetchAppointments,
    confirmReceivedDeposit,
    submitCustomerDecision,
    cancelAppointment,
    reviewedRoomIds,
    paidAppointmentIds,
  } = useBookingStore();

  // State các modal
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineType, setDeclineType] = useState<"CANCEL" | "DECLINE_RENTAL">("CANCEL");
  const [showConfirmRentalModal, setShowConfirmRentalModal] = useState(false);
  const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Tìm lịch hẹn theo appointmentId trong Store
  const foundItem = appointments.find((a) => a.maDatLich === appointmentId);

  // Dữ liệu hiển thị dự phòng nếu là ID mẫu trong mockup
  const item: AppointmentResponse = useMemo(() => {
    if (foundItem) return foundItem;

    return {
      maDatLich: appointmentId || "YCT-260928-0184",
      maPhongTro: "PT260928001",
      tieuDePhong: "Studio ban công Nguyễn Thượng Hiền",
      diaChiPhong: "78 Nguyễn Thượng Hiền, Phường 5, Quận 3, TP.HCM",
      giaThue: 4200000,
      coc: 200000,
      phiThu: 150000,
      ngayHen: "2026-10-05T14:30:00",
      thoiGianDat: "2026-09-26T20:14:00",
      trangThai: "XAC_NHAN" as TrangThaiDatLich,
      daNopCoc: true,
      daNhanLaiCoc: false, // Ban đầu chưa nhận cọc để thể hiện ràng buộc
      khachHangDongY: null,
      chuTroDongY: null,
      hinhAnh:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80",
      tenChuTro: "Minh Anh",
      sdtChuTro: "090 345 6789",
      tenKhachHang: "Nguyễn Ngọc Anh",
      sdtKhachHang: "090 123 4567",
    };
  }, [foundItem, appointmentId]);

  // Kiểm tra cờ nộp cọc
  const isDepositPaid =
    Boolean(item.daNopCoc) || paidAppointmentIds.includes(item.maDatLich);

  // Đã đánh giá phòng chưa
  const isReviewed = reviewedRoomIds.includes(item.maPhongTro);

  // Format ngày/giờ
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "--/--/----";
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

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "--/--/----";
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

  // 1. Xử lý xác nhận đã nhận lại cọc từ Chủ trọ ngoài đời thực (Bước 3 Swimlane)
  const handleConfirmReceivedDeposit = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    const res = await confirmReceivedDeposit(item.maDatLich);
    setIsActionLoading(false);
    setShowConfirmRefundModal(false);

    if (res.success) {
      setActionSuccessMessage(
        "Đã xác nhận nhận lại cọc thành công! Quyền chọn Thuê / Không thuê đã được mở khóa."
      );
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } else {
      setActionErrorMessage(res.message || "Xác nhận nhận lại cọc thất bại");
    }
  };

  // 2. Xử lý gửi quyết định ĐỒNG Ý THUÊ (Bước 4 Swimlane)
  const handleConfirmRentalDecision = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    const res = await submitCustomerDecision(item.maDatLich, true);
    setIsActionLoading(false);
    setShowConfirmRentalModal(false);

    if (res.success) {
      if (res.isCompleted) {
        setActionSuccessMessage(
          "🎉 Chúc mừng bạn! Cả hai bên đã đồng ý. Hợp đồng thuê phòng đã chính thức hoàn tất!"
        );
      } else {
        setActionSuccessMessage(
          "Đã gửi quyết định Đồng ý thuê phòng! Đang chờ Chủ trọ đưa ra quyết định độc lập."
        );
      }
      setTimeout(() => setActionSuccessMessage(null), 6000);
    } else {
      setActionErrorMessage(res.message || "Gửi quyết định thuê thất bại");
    }
  };

  // 3. Xử lý TỪ CHỐI THUÊ hoặc HỦY YÊU CẦU
  const handleDeclineOrCancel = async (reason: string) => {
    setIsActionLoading(true);
    setActionErrorMessage(null);

    if (declineType === "DECLINE_RENTAL") {
      // Từ chối thuê sau khi xem
      const res = await submitCustomerDecision(item.maDatLich, false, reason);
      setIsActionLoading(false);
      setShowDeclineModal(false);

      if (res.success) {
        setActionSuccessMessage(
          "Đã ghi nhận bạn không thuê phòng. Hệ thống đã hoàn tất và kết thúc lịch hẹn."
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      } else {
        setActionErrorMessage(res.message || "Gửi quyết định từ chối thất bại");
      }
    } else {
      // Hủy yêu cầu đặt lịch
      const res = await cancelAppointment(item.maDatLich, reason);
      setIsActionLoading(false);
      setShowDeclineModal(false);

      if (res.success) {
        setActionSuccessMessage(
          "Đã hủy yêu cầu thuê phòng thành công." +
            (item.coc && isDepositPaid ? " Tiền cọc đã được bảo lưu hoàn trả." : "")
        );
        setTimeout(() => setActionSuccessMessage(null), 5000);
      } else {
        setActionErrorMessage(res.message || "Hủy yêu cầu thất bại");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Điều hướng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/booking/rental-requests")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách yêu cầu thuê</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Chi tiết yêu cầu thuê
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mã yêu cầu:{" "}
            <span className="font-semibold text-slate-700">
              YCT-{item.maDatLich.replace(/[^0-9]/g, "").slice(-8) || item.maDatLich}
            </span>
          </p>
        </div>

        {/* Nút thao tác nhanh trên mobile */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0088ff] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer border border-blue-100"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Liên hệ chủ trọ</span>
          </button>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="flex-1">{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span className="flex-1">{actionErrorMessage}</span>
        </div>
      )}

      {/* 2. Grid bố cục 2 cột chính */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3 chiều rộng desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Tóm tắt phòng trọ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                {item.hinhAnh ? (
                  <img
                    src={item.hinhAnh}
                    alt={item.tieuDePhong}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Home className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 line-clamp-1">
                  {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {item.diaChiPhong || "Khu vực trung tâm"}
                  </span>
                </p>
                <p className="text-sm font-extrabold text-[#0088ff] mt-2">
                  {formatVND(item.giaThue)}
                  <span className="text-xs font-normal text-slate-400">/tháng</span>
                </p>
              </div>
            </div>

            {/* Badge trạng thái nhỏ */}
            <div className="self-end sm:self-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                {item.trangThai === "HOAN_THANH"
                  ? "Đã chấp nhận"
                  : item.trangThai === "HUY"
                  ? "Đã hủy"
                  : item.daNhanLaiCoc
                  ? "Chờ xác nhận thuê"
                  : "Đang trao đổi"}
              </span>
            </div>
          </div>

          {/* Card 2: Thông tin thuê */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Thông tin thuê</span>
              <span className="text-xs font-normal text-slate-400">
                Gửi lúc: {formatDateTime(item.thoiGianDat || item.ngayHen)}
              </span>
            </h3>

            {/* Grid 6 ô thông tin chi tiết */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ngày nhận dự kiến
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {formatDate(item.ngayHen)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Thời gian thuê
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  12 tháng
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Số người ở
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  2 người
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Giá thuê
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block">
                  {formatVND(item.giaThue)}/tháng
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tiền cọc giữ chân
                </span>
                <span className="text-xs font-bold text-[#0088ff] mt-1 block">
                  {formatVND(item.coc || 0)}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Phí dịch vụ sàn
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 block">
                  {formatVND(item.phiThu || 150000)}/tháng
                </span>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Ghi chú
              </span>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                {item.liDoHuy ||
                  "Mình cần thêm một bàn làm việc nhỏ. Dự kiến chuyển vào đúng ngày xem phòng."}
              </p>
            </div>
          </div>

          {/* Card 3: Tiến trình yêu cầu (Swimlane) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tiến trình yêu cầu</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quy trình Swimlane khép kín bảo đảm an toàn quyền lợi đôi bên
                </p>
              </div>

              {/* Ràng buộc tag */}
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>InnFinder Bảo chứng</span>
              </div>
            </div>

            {/* Timeline component */}
            <RentalTimeline
              status={item.trangThai}
              ngayHen={item.ngayHen}
              thoiGianDat={item.thoiGianDat}
              daNopCoc={isDepositPaid}
              daNhanLaiCoc={item.daNhanLaiCoc}
              khachHangDongY={item.khachHangDongY}
              chuTroDongY={item.chuTroDongY}
              liDoHuy={item.liDoHuy}
              coc={item.coc}
            />
          </div>
        </div>

        {/* CỘT PHẢI (1/3 chiều rộng desktop) */}
        <div className="space-y-6">
          {/* Card 1: Khách thuê */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Khách thuê
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200">
                {item.tenKhachHang
                  ? item.tenKhachHang
                      .split(" ")
                      .slice(-2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                  : "NA"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {item.tenKhachHang || "Nguyễn Ngọc Anh"}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Đã xác thực · {item.sdtKhachHang || "090 123 4567"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email
                </span>
                <span className="text-slate-700 font-medium">
                  {item.tenKhachHang ? "ngocanh@gmail.com" : "user@innfinder.vn"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Địa chỉ thường trú
                </span>
                <span className="text-slate-700 font-medium">
                  Bình Thạnh, TP.HCM
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Trạng thái & Xác nhận Quyết định (Bám sát Mockup 1 & 2) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              {item.daNhanLaiCoc && item.trangThai === "XAC_NHAN"
                ? "Xác nhận"
                : "Trạng thái"}
            </h3>

            {/* Badge trạng thái & hạn phản hồi */}
            <div className="mb-4">
              <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {item.trangThai === "HOAN_THANH"
                  ? "Hoàn tất thuê phòng"
                  : item.trangThai === "HUY"
                  ? "Lịch hẹn đã hủy"
                  : item.daNhanLaiCoc
                  ? "Sẵn sàng đưa ra quyết định"
                  : "Đang trao đổi điều khoản"}
              </span>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  Hạn phản hồi: {formatDateTime(item.ngayHen)}
                </span>
              </p>
            </div>

            {/* CẢNH BÁO RÀNG BUỘC SWIMLANE */}
            {item.trangThai === "XAC_NHAN" && !item.daNhanLaiCoc && (
              <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Ràng buộc hoàn cọc trực tiếp:</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Tại buổi xem phòng, Chủ trọ trực tiếp trả lại{" "}
                  <strong>100% tiền cọc ({formatVND(item.coc || 0)})</strong> cho bạn.
                  Hãy bấm xác nhận bên dưới khi đã nhận cọc để mở khóa quyền chọn Thuê / Không thuê.
                </p>
              </div>
            )}

            {/* DANH SÁCH NÚT HÀNH ĐỘNG CỦA CỘT PHẢI */}
            <div className="space-y-2.5">
              {/* TRƯỜNG HỢP 1: XAC_NHAN & CHƯA NHẬN LẠI CỌC */}
              {item.trangThai === "XAC_NHAN" && !item.daNhanLaiCoc && (
                <>
                  {/* Nút quan trọng: Xác nhận đã nhận cọc từ Chủ trọ */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmRefundModal(true)}
                    disabled={isActionLoading}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã nhận lại cọc từ Chủ trọ</span>
                  </button>

                  {/* Hai nút quyết định bị khóa tạm thời */}
                  <div className="grid grid-cols-2 gap-2 opacity-50 cursor-not-allowed">
                    <button
                      type="button"
                      disabled
                      title="Cần nhận lại cọc trước để mở khóa"
                      className="py-2.5 px-3 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Xác nhận thuê</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Cần nhận lại cọc trước để mở khóa"
                      className="py-2.5 px-3 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Không thuê</span>
                    </button>
                  </div>

                  {/* Nút liên hệ chủ trọ (Màu xanh dương như Mockup 1) */}
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#0088ff] hover:bg-blue-600 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Liên hệ chủ trọ
                  </button>

                  {/* Nút xem giao dịch */}
                  <Link
                    to="/booking/transactions"
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-center block"
                  >
                    Xem giao dịch
                  </Link>

                  {/* Nút hủy yêu cầu */}
                  <button
                    type="button"
                    onClick={() => {
                      setDeclineType("CANCEL");
                      setShowDeclineModal(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy yêu cầu
                  </button>
                </>
              )}

              {/* TRƯỜNG HỢP 2: ĐÃ NHẬN LẠI CỌC & CHƯA ĐƯA RA QUYẾT ĐỊNH (Khớp Mockup 2) */}
              {item.trangThai === "XAC_NHAN" &&
                item.daNhanLaiCoc &&
                (item.khachHangDongY === null || item.khachHangDongY === undefined) && (
                  <>
                    {/* Nút Xác nhận thuê (Xanh dương như Mockup 2) */}
                    <button
                      type="button"
                      onClick={() => setShowConfirmRentalModal(true)}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#0088ff] hover:bg-blue-600 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Xác nhận thuê
                    </button>

                    {/* Nút Xác nhận không thuê (Màu hồng nhạt chữ đỏ như Mockup 2) */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineType("DECLINE_RENTAL");
                        setShowDeclineModal(true);
                      }}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Xác nhận không thuê
                    </button>

                    {/* Nút Đánh giá (Mờ/Disabled khi chưa hoàn tất) */}
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-xl opacity-60 cursor-not-allowed"
                    >
                      Đánh giá (Mở sau khi chốt hợp đồng)
                    </button>
                  </>
                )}

              {/* TRƯỜNG HỢP 3: KHÁCH ĐÃ CHỌN ĐỒNG Ý THUÊ & CHỜ CHỦ TRỌ */}
              {item.trangThai === "XAC_NHAN" && item.khachHangDongY === true && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Bạn đã chọn: Thuê phòng</span>
                    </p>
                    <p className="mt-1 text-[11px] text-blue-600">
                      Hệ thống đang chờ Chủ trọ đưa ra quyết định độc lập để hoàn tất hợp đồng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-[#0088ff] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Nhắc chủ trọ duyệt
                  </button>
                </div>
              )}

              {/* TRƯỜNG HỢP 4: HOÀN THÀNH THUÊ PHÒNG (Khớp Mockup 2 khi hoàn tất) */}
              {item.trangThai === "HOAN_THANH" && (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Hợp đồng đã hoàn tất!</span>
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Cả hai bên đã đồng ý thuê phòng. Chúc bạn có trải nghiệm tốt tại nơi ở mới!
                    </p>
                  </div>

                  {/* Nút Đánh giá phòng (Kích hoạt) */}
                  <Link
                    to={`/booking/review/${item.maPhongTro}?roomTitle=${encodeURIComponent(
                      item.tieuDePhong || ""
                    )}&roomAddress=${encodeURIComponent(
                      item.diaChiPhong || ""
                    )}&roomImage=${encodeURIComponent(item.hinhAnh || "")}`}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs text-center block"
                  >
                    {isReviewed ? "Xem lại đánh giá" : "Đánh giá phòng ngay"}
                  </Link>

                  <Link
                    to="/booking/transactions"
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-center block"
                  >
                    Xem lịch sử giao dịch
                  </Link>
                </div>
              )}

              {/* TRƯỜNG HỢP 5: LỊCH HẸN BỊ HỦY */}
              {item.trangThai === "HUY" && (
                <div className="space-y-2.5">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <p className="font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Lịch hẹn đã hủy</span>
                    </p>
                    {item.liDoHuy && (
                      <p className="mt-1 text-[11px] text-rose-600">
                        Lý do: {item.liDoHuy}
                      </p>
                    )}
                  </div>
                  <Link
                    to="/booking/appointments"
                    className="w-full py-2.5 px-4 text-xs font-semibold text-[#0088ff] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer text-center block"
                  >
                    Xem các lịch hẹn khác
                  </Link>
                </div>
              )}

              {/* TRƯỜNG HỢP 6: CHO_XAC_NHAN */}
              {item.trangThai === "CHO_XAC_NHAN" && (
                <div className="space-y-2.5">
                  {!isDepositPaid ? (
                    <Link
                      to={`/booking/deposit/${item.maDatLich}?roomId=${item.maPhongTro}&roomTitle=${encodeURIComponent(
                        item.tieuDePhong || ""
                      )}&depositAmount=${item.coc}&ngayHen=${item.ngayHen}`}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#0088ff] hover:bg-blue-600 rounded-xl transition-colors cursor-pointer shadow-xs text-center block"
                    >
                      Nộp tiền cọc ({formatVNDShort(item.coc || 200000)})
                    </Link>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                      <p className="font-bold">Đã nộp cọc giữ chân</p>
                      <p className="text-[11px] text-blue-600 mt-0.5">
                        Chủ trọ đang xem xét lịch hẹn của bạn.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setDeclineType("CANCEL");
                      setShowDeclineModal(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy yêu cầu
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODAL XÁC NHẬN ĐÃ NHẬN LẠI CỌC TỪ CHỦ TRỌ NGOÀI ĐỜI */}
      {showConfirmRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Xác nhận đã nhận lại cọc?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Bạn có xác nhận rằng Chủ trọ đã trực tiếp hoàn trả{" "}
              <strong className="text-emerald-700">
                100% tiền cọc ({formatVND(item.coc || 200000)})
              </strong>{" "}
              bằng tiền mặt hoặc chuyển khoản cho bạn tại buổi xem phòng chưa?
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmRefundModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Chưa nhận
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivedDeposit}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isActionLoading ? "Đang xử lý..." : "Đã nhận đủ 100%"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL XÁC NHẬN CHỐT THUÊ PHÒNG */}
      {showConfirmRentalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 text-[#0088ff]">
              <Home className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Xác nhận chốt thuê phòng?
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Bạn có chắc chắn muốn thuê phòng trọ này? Nếu Chủ trọ cũng xác nhận đồng ý, hợp đồng thuê phòng sẽ chính thức hoàn tất thành công.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmRentalModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmRentalDecision}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-[#0088ff] hover:bg-blue-600 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isActionLoading ? "Đang xử lý..." : "Xác nhận thuê"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL TỪ CHỐI THUÊ HOẶC HỦY HẸN CÓ CHỌN LÝ DO */}
      <DeclineReasonModal
        isOpen={showDeclineModal}
        isLoading={isActionLoading}
        title={
          declineType === "DECLINE_RENTAL"
            ? "Xác nhận không thuê phòng?"
            : "Hủy yêu cầu xem phòng?"
        }
        description={
          declineType === "DECLINE_RENTAL"
            ? "Vui lòng cho biết lý do bạn quyết định không thuê phòng này để hệ thống kết thúc giao dịch an toàn:"
            : "Chủ trọ sẽ nhận được thông báo ngay. Vui lòng cho biết lý do hủy yêu cầu:"
        }
        confirmButtonText={
          declineType === "DECLINE_RENTAL" ? "Xác nhận không thuê" : "Hủy yêu cầu"
        }
        onClose={() => setShowDeclineModal(false)}
        onConfirm={handleDeclineOrCancel}
      />

      {/* 6. MODAL LIÊN HỆ CHỦ TRỌ */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-[#0088ff]">
              <Phone className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Liên hệ Chủ trọ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chủ trọ phòng: {item.tieuDePhong}
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Họ và tên:</span>
                <span className="font-bold text-slate-800">
                  {item.tenChuTro || "Chủ trọ"}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="font-bold text-[#0088ff]">
                  {item.sdtChuTro || "090 345 6789"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <a
                href={`tel:${item.sdtChuTro || "0903456789"}`}
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

export default RentalDetailPage;
