import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Wallet,
  QrCode,
  Smartphone,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  PlusCircle,
  AlertCircle,
  X,
  CreditCard,
  Calendar,
  Phone,
} from "lucide-react";
import { useBookingStore } from "../../store/useBookingStore";
import { roomService } from "../../services/room.service";
import { bookingService } from "../../services/booking.service";
import { formatVND } from "../../utils/formatVND";
import { BookingSuccessModal } from "../../components/booking/BookingSuccessModal";
import { CancelConfirmModal } from "../../components/booking/CancelConfirmModal";
import type { RoomDetailResponse } from "../../types/room.types";
import type { AppointmentResponse } from "../../types/booking.types";

interface LocationState {
  roomId?: string;
  roomTitle?: string;
  roomImage?: string;
  depositAmount?: number;
  ngayHen?: string;
  categoryName?: string;
  phoneNumber?: string;
}

export const DepositPaymentPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const {
    walletBalance,
    topUpWallet,
    payAppointmentDeposit,
    cancelAppointment,
    fetchAppointments,
  } = useBookingStore();

  const [appointmentData, setAppointmentData] = useState<AppointmentResponse | null>(null);
  const [roomData, setRoomData] = useState<RoomDetailResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("WALLET");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Điều khiển 2 modal theo thiết kế người dùng
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [topUpToast, setTopUpToast] = useState<boolean>(false);

  // Tải chi tiết lịch hẹn & phòng từ backend nếu thiếu state
  useEffect(() => {
    let isMounted = true;
    if (appointmentId) {
      bookingService.getMyAppointments().then((list) => {
        if (!isMounted) return;
        const current = list.find((a) => a.maDatLich === appointmentId);
        if (current) {
          setAppointmentData(current);
          if (current.maPhongTro) {
            roomService.getRoomDetail(current.maPhongTro).then((r) => {
              if (isMounted) setRoomData(r);
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  // Thông tin tổng hợp
  const amount =
    state.depositAmount ||
    appointmentData?.coc ||
    roomData?.loaiPhong?.soTienCoc ||
    200000;

  const displayTitle =
    state.roomTitle ||
    appointmentData?.tieuDePhong ||
    roomData?.moTa?.slice(0, 50) ||
    "Phòng trọ tiện nghi";

  const displayImage =
    state.roomImage ||
    appointmentData?.hinhAnh ||
    roomData?.dsHinhAnh?.[0]?.url ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600";

  const displayCategory =
    state.categoryName ||
    roomData?.loaiPhong?.tenLoaiPhongTro ||
    "Phòng trọ khép kín";

  const displayLandlord =
    appointmentData?.tenChuTro ||
    roomData?.chuTro?.hoTen ||
    "Minh Anh";

  const rawDateStr = state.ngayHen || appointmentData?.ngayHen;
  const formatDateTimeDisplay = (isoStr?: string) => {
    if (!isoStr) return "28/09/2026 lúc 18:30";
    try {
      const d = new Date(isoStr);
      const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year} lúc ${time}`;
    } catch {
      return isoStr;
    }
  };

  const formattedDateTime = formatDateTimeDisplay(rawDateStr);
  const isWalletEnough = walletBalance >= amount;

  // Sao chép nội dung chuyển khoản / STK
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Nạp tiền test ví
  const handleTopUp = async (addAmount: number) => {
    await topUpWallet(addAmount);
    setTopUpToast(true);
    setTimeout(() => setTopUpToast(false), 2500);
  };

  // Nộp tiền cọc
  const handleConfirmPayment = async () => {
    setErrorMessage(null);
    if (!appointmentId) {
      setErrorMessage("Không tìm thấy mã lịch hẹn cần nộp cọc.");
      return;
    }

    if (selectedMethod === "WALLET" && !isWalletEnough) {
      setErrorMessage(
        `Số dư ví hiện tại (${formatVND(walletBalance)}) không đủ thanh toán. Vui lòng bấm '+500k Test' ở trên hoặc chọn thanh toán qua VietQR.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await payAppointmentDeposit(appointmentId, amount, selectedMethod);
      if (!ok) {
        setIsSubmitting(false);
        setErrorMessage("Thanh toán không thành công. Vui lòng kiểm tra số dư ví.");
        return;
      }

      await fetchAppointments(true);
      setIsSubmitting(false);

      // Hiển thị modal Đặt lịch thành công đúng theo Ảnh 1
      setShowSuccessModal(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Lỗi nộp cọc giữ chân. Vui lòng thử lại."
      );
    }
  };

  // Xác nhận hủy lịch từ modal
  const handleConfirmCancelAppointment = async (reason: string) => {
    if (appointmentId) {
      await cancelAppointment(appointmentId, reason || "Khách hàng hủy khi đang nộp cọc");
    }
    setShowCancelModal(false);
    navigate("/booking/appointments");
  };

  const cleanApptCode = (appointmentId || "").replace(/\D/g, "") || "123456";
  const vietQrTransferInfo = `IFCOC${cleanApptCode}`;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Container Thẻ trắng viền bo tròn giống Màn 1 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* 1. Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Thanh toán cọc giữ chân
              </h1>
              <p className="text-xs text-slate-500">
                Mã lịch hẹn: <strong className="text-slate-700 font-mono">#{appointmentId}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng / Hủy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Toast thông báo nạp tiền test */}
          {topUpToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã nạp nhanh +500.000 đ vào Ví InnFinder để bạn test thanh toán!
            </div>
          )}

          {/* 2. Thẻ tóm tắt thông tin phòng & Lịch hẹn */}
          <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 pb-3 border-b border-slate-200/70">
              <img
                src={displayImage}
                alt={displayTitle}
                className="w-16 h-16 rounded-xl object-cover bg-slate-200 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-md mb-1">
                  {displayCategory}
                </span>
                <h3 className="text-sm font-bold text-slate-900 truncate" title={displayTitle}>
                  {displayTitle}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  Chủ trọ đón tiếp: <strong className="text-slate-700">{displayLandlord}</strong>
                </p>
              </div>
            </div>

            <div className="pt-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Lịch xem dự kiến:
                </span>
                <span className="font-semibold text-slate-800">{formattedDateTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Số điện thoại:
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {state.phoneNumber || "0987654321"}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/70">
                <span className="font-bold text-slate-700 text-sm">Cọc giữ chân lịch xem:</span>
                <span className="text-xl font-extrabold text-teal-700 font-mono">
                  {formatVND(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Cam kết bảo chứng Swimlane từ InnFinder */}
          <div className="flex items-start gap-3 bg-teal-50/70 border border-teal-200/80 p-4 rounded-xl text-teal-900">
            <ShieldCheck className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-teal-950">Cam kết an toàn cọc 100% từ InnFinder</p>
              <p className="text-teal-800 leading-relaxed">
                Khoản cọc giữ chân ({formatVND(amount)}) do sàn InnFinder tạm giữ an toàn. Đến lịch hẹn gặp mặt xem phòng thực tế ngoài đời, <strong className="text-teal-950 font-semibold">Chủ trọ sẽ trực tiếp hoàn trả lại 100% tiền cọc cho bạn</strong> (tiền mặt / chuyển khoản).
              </p>
            </div>
          </div>

          {/* 4. Chọn phương thức thanh toán */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Chọn phương thức thanh toán
              </label>

              {/* Nút nạp nhanh tiền cho dev test tiện lợi */}
              <button
                type="button"
                onClick={() => handleTopUp(500000)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 text-xs font-bold transition-colors cursor-pointer"
                title="Bấm để nạp thêm 500.000 đ vào Ví test"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                +500k Test Ví
              </button>
            </div>

            {/* Danh sách 3 phương thức thanh toán */}
            <div className="space-y-2.5">
              {/* Option 1: Ví InnFinder */}
              <div
                onClick={() => setSelectedMethod("WALLET")}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedMethod === "WALLET"
                    ? "border-teal-600 bg-teal-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-teal-100/60 text-teal-700 flex items-center justify-center shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Ví điện tử InnFinder
                      </span>
                      {!isWalletEnough && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                          Không đủ
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${!isWalletEnough ? "text-rose-600 font-medium" : "text-slate-500"}`}>
                      Số dư khả dụng: <strong>{formatVND(walletBalance)}</strong>
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "WALLET" ? "border-teal-600" : "border-slate-300"
                  }`}
                >
                  {selectedMethod === "WALLET" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  )}
                </div>
              </div>

              {/* Option 2: VietQR */}
              <div
                onClick={() => setSelectedMethod("VIETQR")}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedMethod === "VIETQR"
                    ? "border-blue-600 bg-blue-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Chuyển khoản Ngân hàng (VietQR)
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quét mã QR tự động điền tiền & nội dung Napas 247
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "VIETQR" ? "border-blue-600" : "border-slate-300"
                  }`}
                >
                  {selectedMethod === "VIETQR" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
              </div>

              {/* Option 3: MoMo / VNPay */}
              <div
                onClick={() => setSelectedMethod("MOMO")}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedMethod === "MOMO"
                    ? "border-fuchsia-600 bg-fuchsia-50/40 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-fuchsia-100/60 text-fuchsia-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Ví điện tử MoMo / VNPay
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Liên kết thanh toán một chạm nhanh chóng
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === "MOMO" ? "border-fuchsia-600" : "border-slate-300"
                  }`}
                >
                  {selectedMethod === "MOMO" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hộp hiển thị mã VietQR động khi chọn phương thức VietQR */}
          {selectedMethod === "VIETQR" && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Quét mã VietQR bằng ứng dụng Ngân Hàng
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mở App Vietcombank, MB, Techcombank, Momo... để quét mã
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                {/* Ảnh VietQR động */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <img
                    src={`https://img.vietqr.io/image/MB-0392833222-compact2.png?amount=${amount}&addInfo=${vietQrTransferInfo}&accountName=INNFINDER%20SAN%20GIAO%20DICH`}
                    alt="VietQR nộp cọc"
                    className="w-48 h-48 rounded-lg object-contain"
                  />
                </div>

                {/* Bảng chi tiết chuyển khoản */}
                <div className="w-full max-w-sm space-y-2.5 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ngân hàng:</span>
                    <strong className="text-slate-800">MB Bank (Quân Đội)</strong>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Số tài khoản:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("0392833222", "stk")}
                      className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
                    >
                      <span className="font-mono">0392833222</span>
                      {copiedField === "stk" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Số tiền:</span>
                    <strong className="text-blue-700 font-bold">{formatVND(amount)}</strong>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Nội dung CK:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(vietQrTransferInfo, "content")}
                      className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800 font-mono cursor-pointer"
                    >
                      <span>{vietQrTransferInfo}</span>
                      {copiedField === "content" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Cụm nút hành động góc dưới */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmPayment}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm transition-all shadow-sm shadow-teal-500/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang ghi nhận cọc...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Xác nhận nộp cọc {formatVND(amount)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: ĐẶT LỊCH THÀNH CÔNG (Khớp 100% Ảnh 1) */}
      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate("/booking/appointments");
        }}
        onViewAppointments={() => {
          setShowSuccessModal(false);
          navigate("/booking/appointments");
        }}
        title="Đặt lịch thành công"
        dateTimeText={formattedDateTime}
        landlordName={displayLandlord}
      />

      {/* MODAL 2: HỘP THOẠI HỦY LỊCH (Khớp 100% Mobile) */}
      <CancelConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancelAppointment}
        title="Hủy lịch xem phòng"
        description="Vui lòng cho biết lý do bạn muốn hủy lịch hẹn này"
        cancelButtonText="Xác nhận hủy"
        keepButtonText="Giữ lại lịch"
      />
    </div>
  );
};

export default DepositPaymentPage;
