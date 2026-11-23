import React, { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Home,
  MapPin,
  Phone,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DeclineReasonModal } from '@/components/booking/DeclineReasonModal';
import { CancelConfirmModal, type BankInfoInput } from '@/components/booking/CancelConfirmModal';
import { RefundSuccessModal } from '@/components/booking/RefundSuccessModal';
import { RentalTimeline } from '@/components/booking/RentalTimeline';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBookingStore } from '@/store/useBookingStore';
import { formatDateTime, formatVND } from '@/utils/formatters';

export const AppointmentDetailPage: React.FC = () => {
  const { id, appointmentId } = useParams<{ id?: string; appointmentId?: string }>();
  const targetId = id || appointmentId || '';
  const navigate = useNavigate();

  const {
    appointments,
    isLoading,
    fetchAppointments,
    confirmReceivedDeposit,
    submitCustomerDecision,
    cancelAppointment,
    reportLandlordNoShow,
    reviewedRoomIds,
    paidAppointmentIds,
  } = useBookingStore();

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmRentalModal, setShowConfirmRentalModal] = useState(false);
  const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRefundSuccessModal, setShowRefundSuccessModal] = useState(false);
  const [showReportLandlordNoShowModal, setShowReportLandlordNoShowModal] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const item = appointments.find((a) => a.maDatLich === targetId);

  if (isLoading && !item) {
    return <LoadingSpinner fullHeight label="Đang tải chi tiết phiếu đặt lịch..." />;
  }

  if (!item) {
    return (
      <EmptyState
        title="Không tìm thấy phiếu đặt lịch"
        description="Phiếu đặt lịch này không tồn tại hoặc không thuộc tài khoản của bạn."
        action={
          <Link
            to="/appointments"
            className="px-5 py-2.5 bg-teal-600 text-white rounded-full text-xs font-bold"
          >
            Quay lại danh sách lịch hẹn
          </Link>
        }
      />
    );
  }

  const isDepositPaid = Boolean(item.daNopCoc) || paidAppointmentIds.includes(item.maDatLich);
  const isReviewed = reviewedRoomIds.includes(item.maPhongTro);

  const shouldShowRefundProgress =
    item.trangThai === 'HUY' && isDepositPaid && !item.daNhanLaiCoc && (item.coc ?? 0) > 0 && Boolean(item.trangThaiHoanCoc);
  const refundStatus = item.trangThaiHoanCoc;

  const handleConfirmReceivedDeposit = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    const res = await confirmReceivedDeposit(item.maDatLich);
    setIsActionLoading(false);
    setShowConfirmRefundModal(false);

    if (res.success) {
      setActionSuccessMessage(
        'Đã xác nhận nhận lại cọc từ Chủ trọ! Bạn có thể chọn thuê hoặc không thuê phòng.',
      );
    } else {
      setActionErrorMessage(res.message || 'Xác nhận nhận lại cọc thất bại');
    }
  };

  const handleConfirmRentalDecision = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    const res = await submitCustomerDecision(item.maDatLich, true);
    setIsActionLoading(false);
    setShowConfirmRentalModal(false);

    if (res.success) {
      if (res.trangThai === 'HOAN_THANH') {
        setActionSuccessMessage('Cả hai bên đã đồng ý! Chốt thuê phòng thành công.');
      } else if (res.trangThai === 'HUY') {
        setActionErrorMessage(res.liDoHuy || 'Phòng trọ đã được khách hàng khác chốt thuê trước.');
      } else {
        setActionSuccessMessage('Đã ghi nhận quyết định Đồng ý thuê của bạn! Đang chờ Chủ trọ xác nhận.');
      }
    } else {
      setActionErrorMessage(res.message || 'Gửi quyết định thuê thất bại');
    }
  };

  const isLateCancel =
    item?.trangThai === 'XAC_NHAN' &&
    item.ngayHen &&
    new Date(item.ngayHen).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000;

  const handleConfirmCancel = async (reason: string, bankInfo?: BankInfoInput) => {
    if (!item) return;
    setIsActionLoading(true);
    setActionErrorMessage(null);

    const res = await cancelAppointment(item.maDatLich, reason, bankInfo);
    setIsActionLoading(false);
    setShowCancelModal(false);

    if (res.success) {
      if (isDepositPaid && (item.coc || 0) > 0 && !isLateCancel) {
        setShowRefundSuccessModal(true);
      } else {
        setActionSuccessMessage('Đã hủy lịch hẹn thành công.');
      }
    } else {
      setActionErrorMessage(res.message || 'Hủy lịch hẹn thất bại');
    }
  };

  const handleDeclineRental = async (reason: string) => {
    if (!item) return;
    setIsActionLoading(true);
    setActionErrorMessage(null);

    const res = await submitCustomerDecision(item.maDatLich, false, reason);
    setIsActionLoading(false);
    setShowDeclineModal(false);
    if (res.success) {
      setActionSuccessMessage('Đã ghi nhận quyết định Không thuê phòng.');
    } else {
      setActionErrorMessage(res.message || 'Gửi quyết định từ chối thất bại');
    }
  };

  const handleReportLandlordNoShow = async () => {
    if (!item) return;
    setIsActionLoading(true);
    setActionErrorMessage(null);

    const res = await reportLandlordNoShow(item.maDatLich);
    setIsActionLoading(false);
    setShowReportLandlordNoShowModal(false);

    if (res.success) {
      setActionSuccessMessage(
        'Đã ghi nhận báo cáo Chủ trọ vắng mặt! Yêu cầu hoàn cọc 100% đang được Sàn xử lý.',
      );
      await fetchAppointments(true);
    } else {
      setActionErrorMessage(res.message || 'Báo cáo chủ trọ vắng mặt thất bại');
    }
  };

  return (
    <div className="max-w-[720px] w-full mx-auto px-4 sm:px-6 py-2 space-y-4">
      {/* 1. THANH TIÊU ĐỀ & TRẠNG THÁI GỌN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                Phiếu hẹn #{item.maDatLich}
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  item.trangThai === 'HOAN_THANH'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.trangThai === 'HUY'
                      ? 'bg-rose-100 text-rose-700'
                      : item.trangThai === 'XAC_NHAN'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.trangThai === 'HOAN_THANH'
                  ? 'Thuê thành công'
                  : item.trangThai === 'HUY'
                    ? 'Lịch đã hủy'
                    : item.trangThai === 'XAC_NHAN'
                      ? 'Đã xác nhận'
                      : 'Chờ chủ trọ duyệt'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hẹn xem: <strong className="text-slate-800">{formatDateTime(item.ngayHen)}</strong>
            </p>
          </div>
        </div>

        {shouldShowRefundProgress && (
          <button
            type="button"
            onClick={() =>
              document.getElementById('refund-progress')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Tiến độ hoàn tiền ↓
          </button>
        )}
      </div>

      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1">{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{actionErrorMessage}</span>
        </div>
      )}

      {/* 2. TIẾN TRÌNH LỊCH HẸN (TIMELINE DỮ LIỆU THẬT) */}
      <Card className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
          Tiến trình lịch hẹn
        </h2>
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
      </Card>

      {/* CẢNH BÁO TRANH CHẤP NO-SHOW (NẾU CHỦ TRỌ BÁO KHÁCH VẮNG MẶT) */}
      {item.trangThai === 'HUY' && item.liDoHuy?.includes('Chủ trọ báo khách vắng mặt') && (
        <Card className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">
                Chủ trọ đã báo bạn vắng mặt (No-show)
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Khoản tiền cọc đang được sàn tạm giữ đối soát trong vòng 24h trước khi giải ngân bồi thường cho Chủ trọ. Nếu bạn thực tế đã có mặt hoặc bị vu oan, vui lòng bấm nút khiếu nại bên dưới kèm ảnh chụp trước cửa nhà trọ hoặc ảnh lịch sử cuộc gọi.
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center justify-end">
            <Link
              to={`/complaints/create?appointmentId=${item.maDatLich}`}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Tôi có mặt / Gửi khiếu nại đối soát</span>
            </Link>
          </div>
        </Card>
      )}

      {/* THÔNG BÁO BÁO CÁO CHỦ TRỌ NO-SHOW */}
      {item.trangThai === 'HUY' && item.liDoHuy?.includes('Khách báo chủ trọ vắng mặt') && (
        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-sky-900">
              Đã ghi nhận báo cáo Chủ trọ vắng mặt
            </h3>
            <p className="text-xs text-sky-700 leading-relaxed">
              Hệ thống đã ghi nhận Chủ trọ không đến dẫn xem phòng. Yêu cầu hoàn lại 100% tiền cọc của bạn đang được Ban Quản Trị đối soát và hoàn tiền về số tài khoản ngân hàng liên kết.
            </p>
          </div>
        </div>
      )}

      {/* THÔNG BÁO QUÁ HẠN PHẢN HỒI TỰ ĐỘNG HỦY */}
      {item.trangThai === 'HUY' && item.liDoHuy?.includes('quá hạn phản hồi') && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
          <Clock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900">
              Lịch hẹn đã tự động hủy do quá hạn phản hồi
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chủ trọ đã không xác nhận lịch hẹn trong thời gian quy định (quá 24h hoặc cách giờ hẹn dưới 2h). Hệ thống đã tự động hủy đơn và tạo lệnh hoàn cọc 100% cho bạn.
            </p>
          </div>
        </div>
      )}

      {/* 3. KHỐI TIẾN ĐỘ HOÀN TIỀN (Chỉ hiện khi phiếu HUY, đã nộp cọc và chưa nhận lại cọc) */}
      {shouldShowRefundProgress && (
        <Card
          id="refund-progress"
          className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-teal-600" />
              <span>Tiến độ hoàn tiền cọc</span>
            </h2>
            {refundStatus === 'THANH_CONG' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã hoàn tiền
              </span>
            ) : refundStatus === 'THAT_BAI' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Từ chối hoàn tiền
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Đang chờ hoàn tiền
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Số tiền cọc cần hoàn:</span>
            <span className="text-sm font-bold text-slate-900">{formatVND(item.coc)}</span>
          </div>

          {refundStatus === 'THANH_CONG' ? (
            <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
              ✓ Tiền cọc đã được chuyển hoàn về tài khoản ngân hàng của bạn
              {item.thoiGianHoanCoc ? ` lúc ${formatDateTime(item.thoiGianHoanCoc)}` : ''}.
            </p>
          ) : refundStatus === 'THAT_BAI' ? (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs space-y-2">
              <p className="text-rose-700 font-medium">
                Lý do từ chối: {item.lyDoTuChoiHoanCoc || 'Thông tin tài khoản nhận tiền chưa chính xác.'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  to={`/transactions/${item.maGiaoDichHoanCoc || ''}`}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs"
                >
                  Cập nhật lại tài khoản
                </Link>
                <Link
                  to={`/complaints/create?appointmentId=${item.maDatLich}`}
                  className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold rounded-lg text-xs"
                >
                  Gửi khiếu nại
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600 bg-sky-50/70 p-3 rounded-xl border border-sky-100">
              Hệ thống đã ghi nhận yêu cầu. Ban Quản Trị đang đối soát và chuyển khoản hoàn tiền cho bạn.
            </p>
          )}

          {item.maGiaoDichHoanCoc && (
            <div className="pt-1 text-right">
              <Link
                to={`/transactions/${item.maGiaoDichHoanCoc}`}
                className="text-xs text-teal-600 hover:underline font-medium inline-flex items-center gap-1"
              >
                <span>Xem chi tiết giao dịch</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </Card>
      )}

      {/* 4. CỤM NÚT HÀNH ĐỘNG THEO NGỮ CẢNH (Chỉ hiện khi lịch CÒN HIỆU LỰC) */}
      {item.trangThai === 'CHO_XAC_NHAN' && (
        <div className="space-y-2 pt-1">
          {!isDepositPaid && (item.coc ?? 0) > 0 && (
            <Link
              to={`/appointments/deposit/${item.maDatLich}`}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors text-center block shadow-xs"
            >
              Nộp tiền cọc giữ chân ({formatVND(item.coc)})
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={isActionLoading}
            className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            Hủy yêu cầu đặt lịch
          </button>
        </div>
      )}

      {item.trangThai === 'XAC_NHAN' && (
        <div className="space-y-2 pt-1">
          {!isDepositPaid && (item.coc ?? 0) > 0 && (
            <Link
              to={`/appointments/deposit/${item.maDatLich}`}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors text-center block shadow-xs"
            >
              Nộp tiền cọc giữ chân ({formatVND(item.coc)})
            </Link>
          )}

          {isDepositPaid && !item.daNhanLaiCoc && (
            <>
              <button
                type="button"
                onClick={() => setShowConfirmRefundModal(true)}
                disabled={isActionLoading}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã nhận lại cọc từ Chủ trọ</span>
              </button>

              {item.ngayHen &&
                new Date().getTime() >= new Date(item.ngayHen).getTime() + 30 * 60 * 1000 && (
                  <button
                    type="button"
                    onClick={() => setShowReportLandlordNoShowModal(true)}
                    disabled={isActionLoading}
                    className="w-full py-2.5 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Báo Chủ trọ vắng mặt (No-show)</span>
                  </button>
                )}

              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={isActionLoading}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Hủy lịch xem phòng
              </button>
            </>
          )}

          {item.daNhanLaiCoc &&
            (item.khachHangDongY === null || item.khachHangDongY === undefined) && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmRentalModal(true)}
                  disabled={isActionLoading}
                  className="py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Xác nhận thuê
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={isActionLoading}
                  className="py-2.5 px-4 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Không thuê
                </button>
              </div>
            )}

          {item.daNhanLaiCoc && item.khachHangDongY === true && (
            <p className="text-xs text-teal-700 bg-teal-50 p-3 rounded-xl border border-teal-100 font-medium">
              ✓ Bạn đã chọn Đồng ý thuê. Đang chờ Chủ trọ xác nhận.
            </p>
          )}
        </div>
      )}

      {item.trangThai === 'HOAN_THANH' && (
        <div className="pt-1">
          <Link
            to={`/reviews/create/${item.maPhongTro}?roomTitle=${encodeURIComponent(
              item.tieuDePhong || '',
            )}&roomAddress=${encodeURIComponent(
              item.diaChiPhong || '',
            )}&roomImage=${encodeURIComponent(item.hinhAnh || '')}`}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors text-center block shadow-xs"
          >
            {isReviewed ? 'Xem / Cập nhật đánh giá' : 'Đánh giá phòng ngay'}
          </Link>
        </div>
      )}

      {/* 5. CARD THÔNG TIN LỊCH HẸN (ĐƠN GIẢN, RÕ RÀNG) */}
      <Card className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
          Thông tin lịch hẹn
        </h2>

        {/* Thông tin phòng trọ */}
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            {item.hinhAnh ? (
              <img
                src={item.hinhAnh}
                alt={item.tieuDePhong}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Home className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              to={`/room/${item.maPhongTro}`}
              className="text-sm font-bold text-slate-900 hover:text-teal-600 block truncate"
            >
              {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
            </Link>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{item.diaChiPhong || '---'}</span>
            </p>
            <p className="text-xs font-extrabold text-teal-700 mt-1">
              {formatVND(item.giaThue)}/tháng
            </p>
          </div>
        </div>

        {/* Bảng chi tiết */}
        <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Giờ hẹn xem phòng</span>
            <span className="font-bold text-slate-800">{formatDateTime(item.ngayHen)}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-500">Tiền cọc giữ chân</span>
            <span className="font-bold text-slate-800">
              {(item.coc ?? 0) > 0 ? formatVND(item.coc) : 'Không yêu cầu cọc'}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-500">Thời gian gửi yêu cầu</span>
            <span className="text-slate-700">
              {item.thoiGianDat ? formatDateTime(item.thoiGianDat) : '---'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Chủ trọ</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {item.tenChuTro || 'Chủ trọ'}
              </span>
              {item.sdtChuTro && (
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="text-[11px] font-semibold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  <span>Gọi ngay</span>
                </button>
              )}
            </div>
          </div>

          {item.liDoHuy && (
            <div className="pt-2 border-t border-slate-100">
              <span className="font-bold text-rose-600 block mb-0.5">Lý do hủy:</span>
              <p className="text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 leading-relaxed">
                {item.liDoHuy}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* MODAL XÁC NHẬN ĐÃ NHẬN LẠI CỌC */}
      {showConfirmRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Xác nhận đã nhận lại cọc?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn xác nhận Chủ trọ đã hoàn trả{' '}
              <strong className="text-emerald-700">{formatVND(item.coc)}</strong> cho bạn tại buổi
              xem phòng?
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmRefundModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Chưa nhận
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivedDeposit}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Đang xử lý...' : 'Đã nhận đủ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN THUÊ PHÒNG */}
      {showConfirmRentalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
              <Home className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận thuê phòng?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khi cả bạn và Chủ trọ cùng xác nhận thuê, trạng thái sẽ chuyển sang Hoàn thành.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmRentalModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmRentalDecision}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Đang xử lý...' : 'Đồng ý thuê'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TỪ CHỐI THUÊ PHÒNG */}
      <DeclineReasonModal
        isOpen={showDeclineModal}
        isLoading={isActionLoading}
        title="Xác nhận không thuê phòng?"
        description="Vui lòng nhập lý do để ghi nhận vào lịch hẹn:"
        confirmButtonText="Xác nhận không thuê"
        onClose={() => setShowDeclineModal(false)}
        onConfirm={handleDeclineRental}
      />

      {/* MODAL HỦY LỊCH HẸN (DÙNG CANCEL CONFIRM MODAL ĐỒNG BỘ) */}
      <CancelConfirmModal
        isOpen={showCancelModal}
        isLoading={isActionLoading}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancel}
        title={isLateCancel ? 'Hủy lịch hẹn sát giờ (< 2 tiếng)?' : 'Hủy lịch xem phòng'}
        description={
          isLateCancel
            ? `⚠️ Còn dưới 2 tiếng trước hẹn! Hủy sát giờ sẽ không được hoàn cọc mà tiền cọc (${formatVND(
                item.coc || 0,
              )}) sẽ bồi thường cho Chủ trọ. Bạn có chắc muốn hủy?`
            : 'Vui lòng chọn lý do hủy lịch hẹn.'
        }
        cancelButtonText={
          isActionLoading
            ? 'Đang hủy...'
            : isLateCancel
              ? 'Chấp nhận mất cọc & Hủy'
              : isDepositPaid && (item.coc || 0) > 0
                ? 'Xác nhận hủy & Hoàn cọc'
                : 'Xác nhận hủy lịch'
        }
        keepButtonText="Giữ lại lịch"
        depositAmount={item.coc || 0}
        isRefundEligible={!isLateCancel && isDepositPaid && (item.coc || 0) > 0}
      />

      {/* MODAL LIÊN HỆ CHỦ TRỌ */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600">
              <Phone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Liên hệ Chủ trọ</h3>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Họ tên:</span>
                <span className="font-bold text-slate-800">{item.tenChuTro || 'Chủ trọ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SĐT:</span>
                <span className="font-bold text-teal-600 font-mono">{item.sdtChuTro || '---'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              {item.sdtChuTro && (
                <a
                  href={`tel:${item.sdtChuTro}`}
                  className="flex-1 py-2 px-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi ngay</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÔNG BÁO YÊU CẦU HOÀN TIỀN ĐÃ GỬI */}
      <RefundSuccessModal
        isOpen={showRefundSuccessModal}
        onClose={() => setShowRefundSuccessModal(false)}
        onViewTransactions={() => {
          setShowRefundSuccessModal(false);
          navigate('/transactions');
        }}
        maDatLich={item.maDatLich}
        depositAmount={item.coc}
      />

      {/* MODAL BÁO CÁO CHỦ TRỌ NO-SHOW */}
      {showReportLandlordNoShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Báo Chủ trọ vắng mặt (No-show)?</h3>
            <div className="text-xs text-slate-600 leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <p>Bạn đang báo cáo Chủ trọ không đến dẫn xem phòng sau 30 phút giờ hẹn:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Lịch hẹn sẽ được chuyển sang trạng thái <strong>Đã hủy</strong>.</li>
                <li>Hệ thống sẽ lập lệnh <strong>hoàn trả 100% tiền cọc ({formatVND(item.coc)})</strong> về tài khoản ngân hàng của bạn.</li>
                <li>Chủ trọ sẽ bị trừ 10 điểm uy tín.</li>
              </ul>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReportLandlordNoShowModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReportLandlordNoShow}
                disabled={isActionLoading}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Đang gửi...' : 'Xác nhận báo vắng mặt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetailPage;
