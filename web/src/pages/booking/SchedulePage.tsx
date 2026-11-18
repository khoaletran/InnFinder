import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Phone,
  AlertCircle,
  X,
  CheckCircle2,
  Info,
  MapPin,
  Coins,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import { roomService } from "../../services/room.service";
import { useBookingStore } from "../../store/useBookingStore";
import { formatVND, formatVNDShort } from "../../utils/formatVND";
import { TimeSlotPicker } from "../../components/booking/TimeSlotPicker";
import { BookingSuccessModal } from "../../components/booking/BookingSuccessModal";
import { CancelConfirmModal } from "../../components/booking/CancelConfirmModal";
import type { RoomDetailResponse } from "../../types/room.types";

export const SchedulePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchAppointments } = useBookingStore();

  const roomId = searchParams.get("roomId") || "PT0111260001";
  const paramTitle = searchParams.get("title");
  const paramPrice = searchParams.get("price");
  const paramImage = searchParams.get("image");

  // State thông tin phòng
  const [roomData, setRoomData] = useState<RoomDetailResponse | null>(null);

  // Form State
  // Mặc định: ngày mai hoặc hôm nay nếu còn slot
  const getInitialDate = () => {
    const today = new Date();
    // Nếu hiện tại đã sau 17:00, mặc định chọn ngày mai
    if (today.getHours() >= 17) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }
    return today.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate);
  const [selectedTime, setSelectedTime] = useState<string>("09:30");
  const [phoneNumber, setPhoneNumber] = useState<string>("0987654321"); // Khớp tài khoản khachhang_an
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Điều khiển Modal theo Ảnh 1 và Ảnh 2
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [submittedDateTime, setSubmittedDateTime] = useState<string>("");

  // Tải chi tiết phòng từ backend
  useEffect(() => {
    let isMounted = true;

    roomService
      .getRoomDetail(roomId)
      .then((data) => {
        if (isMounted) {
          setRoomData(data);
        }
      })
      .catch((err) => {
        console.warn("Không tải được chi tiết phòng từ backend:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // Thông tin hiển thị tóm tắt phòng
  const displayImage =
    paramImage ||
    roomData?.dsHinhAnh?.find((img) => img.laDaiDien)?.url ||
    roomData?.dsHinhAnh?.[0]?.url ||
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600";

  const displayTitle =
    paramTitle ||
    roomData?.moTa?.slice(0, 50) ||
    (roomData?.tenPhong ? roomData.tenPhong : `Phòng trọ mã #${roomId}`);

  const displayAddress =
    roomData?.diaChi || "78 Nguyễn Thượng Hiền, Phường 5, Quận 3, TP.HCM";

  const displayPrice = roomData?.giaThue
    ? formatVNDShort(roomData.giaThue)
    : paramPrice
      ? formatVNDShort(Number(paramPrice))
      : "4.2 triệu/tháng";

  const roomCategoryName =
    roomData?.loaiPhong?.tenLoaiPhongTro || "Phòng trọ khép kín";

  // Mức cọc giữ chân lịch xem động theo Loại phòng (Swimlane rule)
  const depositAmount = roomData?.loaiPhong?.soTienCoc ?? 200000;

  // Tính toán nhanh ngày: Hôm nay, Ngày mai, Ngày kia
  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr === today;
  };

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split("T")[0];
  };

  // Submit đặt lịch xem phòng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Kiểm tra ngày giờ
    if (!selectedDate || !selectedTime) {
      setErrorMessage("Vui lòng chọn ngày và giờ hẹn xem phòng.");
      return;
    }

    const [year, month, day] = selectedDate.split("-").map(Number);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const minValidTime = Date.now() + 60 * 60 * 1000; // Phải sau hiện tại ít nhất 1 tiếng
    if (appointmentDateTime.getTime() < minValidTime) {
      setErrorMessage(
        "Thời gian hẹn xem phòng phải sau thời điểm hiện tại ít nhất 1 tiếng. Vui lòng chọn lại!"
      );
      return;
    }

    // 2. Kiểm tra số điện thoại
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setErrorMessage("Số điện thoại không hợp lệ (gồm 10 chữ số, đầu số Việt Nam).");
      return;
    }

    // 3. Chuẩn bị ISO string: yyyy-MM-ddTHH:mm:00
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoString = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;

    setIsSubmitting(true);
    try {
      const response = await bookingService.createAppointment({
        maPhongTro: roomId,
        ngayHen: isoString,
        ghiChu: note.trim() || undefined,
      });

      await fetchAppointments(true);
      setIsSubmitting(false);

      const createdAppointmentId = response?.maDatLich;
      const coc = response?.coc ?? depositAmount;
      const formattedDateDisplay = `${pad(day)}/${pad(month)}/${year} lúc ${pad(hours)}:${pad(minutes)}`;
      setSubmittedDateTime(formattedDateDisplay);

      // Nếu phòng có cọc giữ chân -> Điều hướng sang nộp cọc
      if (coc > 0 && createdAppointmentId) {
        navigate(`/booking/deposit/${createdAppointmentId}`, {
          state: {
            roomId,
            roomTitle: displayTitle,
            roomImage: displayImage,
            depositAmount: coc,
            ngayHen: isoString,
            categoryName: roomCategoryName,
            phoneNumber,
          },
        });
      } else {
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Không thể gửi yêu cầu đặt lịch. Vui lòng kiểm tra kết nối Backend."
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Modal / Card Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Đặt lịch xem phòng
              </h1>
              <p className="text-xs text-slate-500">
                Gặp trực tiếp chủ trọ để khảo sát chất lượng phòng
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 1. Tóm tắt thông tin phòng trọ */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <img
                src={displayImage}
                alt={displayTitle}
                className="w-full sm:w-28 h-24 object-cover rounded-lg bg-slate-200"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-100 text-blue-700">
                      {roomCategoryName}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{roomId}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 truncate" title={displayTitle}>
                    {displayTitle}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {displayAddress}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                  <div className="text-xs text-slate-500">
                    Giá thuê:{" "}
                    <strong className="text-sm font-bold text-blue-600">{displayPrice}</strong>
                  </div>
                  <div className="text-xs flex items-center gap-1 text-slate-600">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    Cọc giữ chân:{" "}
                    <strong className="text-amber-700 font-bold">
                      {depositAmount > 0 ? formatVND(depositAmount) : "Miễn cọc"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* 2. Chọn Ngày xem & Khung giờ */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Ngày xem */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Ngày xem phòng <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                    />
                  </div>

                  {/* Nút chọn nhanh ngày */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                        isToday(selectedDate)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                        isTomorrow(selectedDate)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      Ngày mai
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="px-2.5 py-1 text-xs rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Ngày kia
                    </button>
                  </div>
                </div>

                {/* Giờ xem tùy chỉnh */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Giờ hẹn chính xác <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    Khung giờ dẫn khách hoạt động từ 08:00 đến 19:00 hàng ngày.
                  </p>
                </div>
              </div>

              {/* Lưới chọn nhanh khung giờ */}
              <TimeSlotPicker
                selectedTime={selectedTime}
                onSelectTime={(time) => setSelectedTime(time)}
                selectedDate={selectedDate}
              />
            </div>

            {/* 3. Số điện thoại liên hệ */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  placeholder="Nhập số điện thoại (ví dụ: 0987654321)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={10}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
              <p className="text-xs text-slate-400">
                Chủ trọ sẽ gọi điện thoại xác nhận hoặc thông báo chỉ đường cho bạn.
              </p>
            </div>

            {/* 4. Ghi chú */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Ghi chú cho chủ trọ (Tùy chọn)
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Tôi muốn xem kỹ khu bếp, chỗ để xe máy và hỏi về nội quy giờ giấc..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={255}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
                />
              </div>
            </div>

            {/* 5. Hộp thông tin hỗ trợ & Cam kết cọc Swimlane */}
            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-blue-900">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                Chủ trọ thường phản hồi trong vòng 2 giờ
              </div>
              <p className="leading-relaxed text-slate-600">
                🛡️ <strong className="text-slate-700">Cơ chế bảo vệ cọc:</strong> Khoản tiền cọc giữ chân ({formatVND(depositAmount)}) do sàn InnFinder tạm giữ an toàn. Khi hai bên gặp mặt dẫn xem phòng thực tế ngoài đời, <strong className="text-slate-800">Chủ trọ sẽ trực tiếp trả lại 100% tiền cọc cho bạn</strong> (tiền mặt / chuyển khoản).
              </p>
            </div>

            {/* 6. Action Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận đặt lịch
                  </>
                )}
              </button>
            </div>
          </form>
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
          dateTimeText={submittedDateTime || "28/09/2026 lúc 18:30"}
          landlordName={roomData?.chuTro?.hoTen || "Minh Anh"}
        />

        {/* MODAL 2: HỘP THOẠI HỦY LỊCH (Khớp 100% Ảnh 2) */}
        <CancelConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirmCancel={() => {
            setShowCancelModal(false);
            navigate("/booking/appointments");
          }}
          title="Hủy đặt lịch?"
          description="Bạn có chắc chắn muốn hủy quá trình đặt lịch này không?"
          cancelButtonText="Xác nhận hủy"
          keepButtonText="Giữ lại"
          requireReason={false}
        />
      </div>
    );
  };

export default SchedulePage;
