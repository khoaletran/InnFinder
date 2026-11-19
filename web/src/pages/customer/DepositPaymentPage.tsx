import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';
import { CancelConfirmModal } from '@/components/booking/CancelConfirmModal';
import { appointmentService } from '@/services/appointment.service';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { formatDateTime, formatVND } from '@/utils/formatters';

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
  const { user } = useAuthStore();
  const state = (location.state as LocationState) || {};

  const { payAppointmentDeposit, cancelAppointment, fetchAppointments } = useBookingStore();

  const [selectedMethod, setSelectedMethod] = useState<'VIETQR' | 'MOMO'>('VIETQR');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  const { data: myAppointments = [] } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: appointmentService.getMyAppointments,
    enabled: !!appointmentId,
  });

  const appointmentData = myAppointments.find((a) => a.maDatLich === appointmentId) || null;
  const targetRoomId = state.roomId || appointmentData?.maPhongTro || '';

  const { data: roomData } = useQuery({
    queryKey: ['rooms', 'detail', targetRoomId],
    queryFn: () => roomService.getRoomDetail(targetRoomId),
    enabled: !!targetRoomId,
  });

  const amount =
    state.depositAmount ||
    appointmentData?.coc ||
    roomData?.loaiPhong?.soTienCoc ||
    200_000;

  const displayTitle =
    state.roomTitle ||
    appointmentData?.tieuDePhong ||
    roomData?.tieuDe ||
    roomData?.moTa?.slice(0, 50) ||
    'Phòng trọ trên sàn InnFinder';

  const displayImage =
    state.roomImage ||
    appointmentData?.hinhAnh ||
    roomData?.dsHinhAnh?.[0]?.url ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';

  const displayCategory =
    state.categoryName ||
    roomData?.loaiPhong?.tenLoaiPhongTro ||
    roomData?.loaiPhong?.tenLoaiPhong ||
    'Phòng trọ';

  const displayLandlord =
    appointmentData?.tenChuTro ||
    roomData?.chuTro?.hoVaTen ||
    roomData?.chuTro?.hoTen ||
    'Chủ trọ xác thực';

  const formattedDateTime = formatDateTime(state.ngayHen || appointmentData?.ngayHen);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Đã sao chép vào bộ nhớ tạm');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayment = async () => {
    setErrorMessage(null);
    if (!appointmentId) {
      setErrorMessage('Không tìm thấy mã lịch hẹn cần nộp cọc.');
      return;
    }

    setIsSubmitting(true);
    const res = await payAppointmentDeposit(appointmentId);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Ghi nhận tiền cọc thất bại. Vui lòng thử lại.');
      return;
    }

    await fetchAppointments(true);
    setShowSuccessModal(true);
  };

  const handleConfirmCancelAppointment = async (reason: string) => {
    if (appointmentId) {
      await cancelAppointment(appointmentId, reason || 'Khách hàng hủy trước khi nộp cọc');
    }
    setShowCancelModal(false);
    navigate('/appointments');
  };

  const cleanApptCode = (appointmentId || '').replace(/\D/g, '') || '123456';
  const vietQrTransferInfo = `IFCOC${cleanApptCode}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Thanh toán cọc giữ chân lịch xem
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

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
                <h3 className="text-sm font-bold text-slate-900 truncate">{displayTitle}</h3>
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
                  Lịch hẹn đã xác nhận:
                </span>
                <span className="font-semibold text-slate-800">{formattedDateTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Số điện thoại khách hẹn:
                </span>
                <span className="font-semibold text-slate-800 font-mono">
                  {state.phoneNumber || user?.sdt || '---'}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200/70">
                <span className="font-bold text-slate-700 text-sm">Mức cọc giữ chân:</span>
                <span className="text-xl font-extrabold text-teal-700 font-mono">
                  {formatVND(amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-teal-50/70 border border-teal-200/80 p-4 rounded-xl text-teal-900">
            <ShieldCheck className="w-6 h-6 text-teal-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-teal-950">Cam kết hoàn cọc 100% tại buổi xem phòng</p>
              <p className="text-teal-800 leading-relaxed">
                Hệ thống InnFinder tạm giữ an toàn khoản cọc {formatVND(amount)}. Khi gặp mặt xem
                phòng thực tế ngoài đời,{' '}
                <strong className="text-teal-950">
                  Chủ trọ trực tiếp trả lại đủ 100% tiền cọc cho bạn
                </strong>{' '}
                (tiền mặt hoặc chuyển khoản), bất kể bạn quyết định thuê hay không thuê.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Chọn phương thức thanh toán cọc
            </label>

            <div className="space-y-2.5">
              <div
                onClick={() => setSelectedMethod('VIETQR')}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedMethod === 'VIETQR'
                    ? 'border-teal-600 bg-teal-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-teal-100/60 text-teal-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Chuyển khoản Ngân hàng (VietQR NAPAS 24/7)
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quét mã QR tự động điền đúng số tiền cọc & nội dung đối soát
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'VIETQR' ? 'border-teal-600' : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'VIETQR' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  )}
                </div>
              </div>

              <div
                onClick={() => setSelectedMethod('MOMO')}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedMethod === 'MOMO'
                    ? 'border-fuchsia-600 bg-fuchsia-50/40 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-fuchsia-100/60 text-fuchsia-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-sm">
                      Cổng thanh toán MoMo / VNPay
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thanh toán nhanh qua ứng dụng ví điện tử cá nhân
                    </p>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethod === 'MOMO' ? 'border-fuchsia-600' : 'border-slate-300'
                  }`}
                >
                  {selectedMethod === 'MOMO' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-600" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {selectedMethod === 'VIETQR' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="text-center">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Quét mã VietQR bằng ứng dụng Ngân Hàng
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                  <img
                    src={`https://img.vietqr.io/image/MB-0392833222-compact2.png?amount=${amount}&addInfo=${vietQrTransferInfo}&accountName=INNFINDER%20ESCROW`}
                    alt="VietQR nộp cọc"
                    className="w-44 h-44 rounded-lg object-contain"
                  />
                </div>

                <div className="w-full max-w-sm space-y-2.5 text-xs bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                    <strong className="text-slate-800">MBBank</strong>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Số tài khoản sàn:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('0392833222', 'stk')}
                      className="inline-flex items-center gap-1 font-bold text-teal-700 cursor-pointer"
                    >
                      <span className="font-mono">0392833222</span>
                      {copiedField === 'stk' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Số tiền cọc:</span>
                    <strong className="text-teal-700 font-bold">{formatVND(amount)}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Nội dung đối soát:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(vietQrTransferInfo, 'content')}
                      className="inline-flex items-center gap-1 font-bold text-teal-700 font-mono cursor-pointer"
                    >
                      <span>{vietQrTransferInfo}</span>
                      {copiedField === 'content' ? (
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors cursor-pointer"
            >
              Hủy lịch
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmPayment}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xác nhận cọc...' : `Xác nhận đã nộp cọc ${formatVND(amount)}`}</span>
            </button>
          </div>
        </div>
      </div>

      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate('/appointments');
        }}
        onViewAppointments={() => {
          setShowSuccessModal(false);
          navigate('/appointments');
        }}
        title="Đã nộp cọc giữ chân thành công"
        dateTimeText={formattedDateTime}
        landlordName={displayLandlord}
      />

      <CancelConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancelAppointment}
        title="Hủy lịch xem phòng"
        description="Vui lòng nhập lý do hủy lịch hẹn này"
        cancelButtonText="Xác nhận hủy"
        keepButtonText="Giữ lại lịch"
      />
    </div>
  );
};

export default DepositPaymentPage;
