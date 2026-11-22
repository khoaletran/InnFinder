import React, { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Home,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DeclineReasonModal } from '@/components/booking/DeclineReasonModal';
import { RentalTimeline } from '@/components/booking/RentalTimeline';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { formatDate, formatDateTime, formatVND, formatVNDShort } from '@/utils/formatters';

export const AppointmentDetailPage: React.FC = () => {
  const { id, appointmentId } = useParams<{ id?: string; appointmentId?: string }>();
  const targetId = id || appointmentId || '';
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    appointments,
    isLoading,
    fetchAppointments,
    confirmReceivedDeposit,
    submitCustomerDecision,
    cancelAppointment,
    reviewedRoomIds,
    paidAppointmentIds,
  } = useBookingStore();

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineType, setDeclineType] = useState<'CANCEL' | 'DECLINE_RENTAL'>('CANCEL');
  const [showConfirmRentalModal, setShowConfirmRentalModal] = useState(false);
  const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
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

  const handleConfirmReceivedDeposit = async () => {
    setIsActionLoading(true);
    setActionErrorMessage(null);
    const res = await confirmReceivedDeposit(item.maDatLich);
    setIsActionLoading(false);
    setShowConfirmRefundModal(false);

    if (res.success) {
      setActionSuccessMessage(
        'Đã xác nhận nhận lại 100% cọc từ Chủ trọ! Quyền chọn Thuê / Không thuê đã được mở khóa.',
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
      setActionSuccessMessage(
        res.isCompleted
          ? 'Cả hai bên đã đồng ý! Chốt thuê phòng thành công.'
          : 'Đã ghi nhận quyết định Đồng ý thuê của bạn! Đang chờ Chủ trọ xác nhận độc lập.',
      );
    } else {
      setActionErrorMessage(res.message || 'Gửi quyết định thuê thất bại');
    }
  };

  const handleDeclineOrCancel = async (reason: string) => {
    setIsActionLoading(true);
    setActionErrorMessage(null);

    if (declineType === 'DECLINE_RENTAL') {
      const res = await submitCustomerDecision(item.maDatLich, false, reason);
      setIsActionLoading(false);
      setShowDeclineModal(false);
      if (res.success) {
        setActionSuccessMessage(
          'Đã ghi nhận quyết định Không thuê. Hệ thống hoàn trả đủ 100% cọc thế chân cho Chủ trọ và thu phí sàn 0 ₫.',
        );
      } else {
        setActionErrorMessage(res.message || 'Gửi quyết định từ chối thất bại');
      }
    } else {
      const res = await cancelAppointment(item.maDatLich, reason);
      setIsActionLoading(false);
      setShowDeclineModal(false);
      if (res.success) {
        setActionSuccessMessage('Đã hủy lịch hẹn thành công.');
      } else {
        setActionErrorMessage(res.message || 'Hủy lịch hẹn thất bại');
      }
    }
  };

  return (
    <div className="max-w-[800px] w-full mx-auto px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Lịch xem phòng</span>
          </button>
          <h1 className="text-[28px] leading-[1.25] font-extrabold text-slate-900 tracking-tight">
            Chi tiết lịch hẹn &amp; Quyết định thuê
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Mã phiếu đặt lịch: <span className="font-mono font-semibold text-slate-800">#{item.maDatLich}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer border border-teal-100 self-start sm:self-auto"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Liên hệ chủ trọ</span>
        </button>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{actionSuccessMessage}</span>
        </div>
      )}
      {actionErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{actionErrorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <Card className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
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
                <Link
                  to={`/room/${item.maPhongTro}`}
                  className="text-base font-bold text-slate-900 hover:text-teal-600 line-clamp-1"
                >
                  {item.tieuDePhong || `Phòng trọ #${item.maPhongTro}`}
                </Link>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{item.diaChiPhong || '---'}</span>
                </p>
                <p className="text-sm font-extrabold text-teal-600 mt-2">
                  {formatVND(item.giaThue)}
                  <span className="text-xs font-normal text-slate-400">/tháng (ngoài sàn)</span>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {item.trangThai === 'HOAN_THANH'
                ? 'Đã hoàn tất thuê'
                : item.trangThai === 'HUY'
                  ? 'Đã hủy'
                  : item.daNhanLaiCoc
                    ? 'Chờ 2 bên chốt thuê'
                    : item.trangThai === 'XAC_NHAN'
                      ? 'Đã xác nhận lịch'
                      : 'Chờ chủ trọ xác nhận'}
            </span>
          </Card>

          {/* Thông tin tài chính chuẩn Swimlane 2.3: phiThu là hoa hồng 1 lần trích từ cọc chủ trọ, KHÔNG phải /tháng */}
          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
            <Card.Header className="p-0 pb-3 mb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <Card.Title className="text-sm font-bold text-slate-900">
                Thông tin lịch hẹn & Đối soát cọc giữ chân
              </Card.Title>
              <span className="text-xs text-slate-400">
                Tạo lúc: {formatDateTime(item.thoiGianDat || item.ngayHen)}
              </span>
            </Card.Header>

            <Card.Content className="p-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ngày giờ hẹn xem
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {formatDateTime(item.ngayHen)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Cọc giữ chân
                  </span>
                  <span className="text-xs font-bold text-teal-600 mt-1 block">
                    {formatVND(item.coc || 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Phí khách thuê trả sàn
                  </span>
                  <span className="text-xs font-bold text-emerald-600 mt-1 block">
                    0 ₫ (Miễn phí)
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Hoa hồng sàn (Chủ trọ chịu)
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {formatVND(item.phiThu || 0)} (1 lần khi chốt thuê)
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quyết định Khách thuê
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {item.khachHangDongY === true
                      ? 'Đồng ý thuê'
                      : item.khachHangDongY === false
                        ? 'Không thuê'
                        : 'Chưa chọn'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quyết định Chủ trọ
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block">
                    {item.chuTroDongY === true
                      ? 'Đồng ý cho thuê'
                      : item.chuTroDongY === false
                        ? 'Từ chối'
                        : 'Chưa chọn'}
                  </span>
                </div>
              </div>

              {item.liDoHuy && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <span className="block text-[11px] font-bold text-rose-500 uppercase tracking-wider mb-1">
                    Lý do hủy / từ chối
                  </span>
                  <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200/60">
                    {item.liDoHuy}
                  </p>
                </div>
              )}
            </Card.Content>
          </Card>

          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
            <Card.Header className="p-0 pb-3 mb-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <Card.Title className="text-sm font-bold text-slate-900">
                  Tiến trình Swimlane Khép kín
                </Card.Title>
                <Card.Description className="text-[11px] text-slate-400 mt-0.5">
                  Đặt lịch ➔ Nộp cọc ➔ Chủ trọ xác nhận ➔ Nhận lại cọc trực tiếp ➔ Hai bên quyết định độc lập
                </Card.Description>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>InnFinder Escrow</span>
              </div>
            </Card.Header>

            <Card.Content className="p-0">
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
            </Card.Content>
          </Card>
        </div>

        {/* Cột phải */}
        <div className="space-y-6">
          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Thông tin Khách thuê
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-teal-50 text-teal-700 font-bold text-sm flex items-center justify-center border border-teal-200">
                {(item.tenKhachHang || user?.hoVaTen || user?.tenDangNhap || 'KH')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {item.tenKhachHang || user?.hoVaTen || user?.tenDangNhap || 'Khách thuê'}
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SĐT: {item.sdtKhachHang || user?.sdt || '---'}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">Ngày hẹn: {formatDate(item.ngayHen)}</p>
          </Card>

          <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Thao tác xác nhận</h3>

            <div className="mb-4">
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Lịch hẹn: {formatDateTime(item.ngayHen)}</span>
              </p>
            </div>

            {!isDepositPaid && (item.coc ?? 0) > 0 && item.trangThai !== 'HUY' && item.trangThai !== 'HOAN_THANH' && (
              <div className="mb-4">
                <Link
                  to={`/appointments/deposit/${item.maDatLich}`}
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors text-center block shadow-2xs"
                >
                  Nộp tiền cọc giữ chân ({formatVNDShort(item.coc || 200000, '')})
                </Link>
              </div>
            )}

            {item.trangThai === 'XAC_NHAN' && isDepositPaid && !item.daNhanLaiCoc && (
              <div className="mb-4 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Bước 4 Swimlane: Nhận lại cọc trực tiếp</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Tại buổi dẫn xem phòng, Chủ trọ trực tiếp hoàn trả{' '}
                  <strong>100% cọc ({formatVND(item.coc || 0)})</strong> cho bạn. Bấm xác nhận bên
                  dưới sau khi đã nhận tiền để mở khóa quyết định Thuê / Không thuê.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {item.trangThai === 'XAC_NHAN' && isDepositPaid && !item.daNhanLaiCoc && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowConfirmRefundModal(true)}
                    disabled={isActionLoading}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã nhận lại cọc từ Chủ trọ</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 opacity-50 cursor-not-allowed">
                    <button
                      type="button"
                      disabled
                      className="py-2.5 px-3 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Xác nhận thuê</span>
                    </button>
                    <button
                      type="button"
                      disabled
                      className="py-2.5 px-3 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Không thuê</span>
                    </button>
                  </div>
                </>
              )}

              {item.trangThai === 'XAC_NHAN' &&
                item.daNhanLaiCoc &&
                (item.khachHangDongY === null || item.khachHangDongY === undefined) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowConfirmRentalModal(true)}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      Xác nhận thuê phòng
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeclineType('DECLINE_RENTAL');
                        setShowDeclineModal(true);
                      }}
                      disabled={isActionLoading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Xác nhận không thuê
                    </button>
                  </>
                )}

              {item.trangThai === 'XAC_NHAN' && item.khachHangDongY === true && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Bạn đã xác nhận: Đồng ý thuê</span>
                  </p>
                  <p className="mt-1 text-[11px] text-teal-600">
                    Đang chờ Chủ trọ bấm xác nhận độc lập trên Cổng Chủ trọ.
                  </p>
                </div>
              )}

              {item.trangThai === 'HOAN_THANH' && (
                <div className="space-y-2.5">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Giao dịch thuê phòng hoàn tất!</span>
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Cả hai bên đã đồng ý thuê phòng. Bạn có thể gửi đánh giá chất lượng phòng bên
                      dưới.
                    </p>
                  </div>

                  <Link
                    to={`/reviews/create/${item.maPhongTro}?roomTitle=${encodeURIComponent(
                      item.tieuDePhong || '',
                    )}&roomAddress=${encodeURIComponent(
                      item.diaChiPhong || '',
                    )}&roomImage=${encodeURIComponent(item.hinhAnh || '')}`}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors text-center block shadow-2xs"
                  >
                    {isReviewed ? 'Xem / Cập nhật đánh giá' : 'Đánh giá phòng ngay'}
                  </Link>
                </div>
              )}

              {item.trangThai === 'HUY' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Lịch hẹn đã kết thúc / hủy</span>
                  </p>
                  {item.liDoHuy && (
                    <p className="mt-1 text-[11px] text-rose-600">Lý do: {item.liDoHuy}</p>
                  )}
                </div>
              )}

              {item.trangThai === 'CHO_XAC_NHAN' && (
                <button
                  type="button"
                  onClick={() => {
                    setDeclineType('CANCEL');
                    setShowDeclineModal(true);
                  }}
                  className="w-full py-2.5 px-4 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy yêu cầu đặt lịch
                </button>
              )}

              <Link
                to="/transactions"
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors text-center block"
              >
                Xem sổ cái giao dịch
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {showConfirmRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Xác nhận đã nhận lại cọc?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Bạn xác nhận Chủ trọ đã trực tiếp trả lại{' '}
              <strong className="text-emerald-700">100% tiền cọc ({formatVND(item.coc)})</strong>{' '}
              cho bạn tại buổi xem phòng? Khi xác nhận, khoản cọc đang tạm giữ trên hệ thống sẽ
              chuyển sang thế chân cho Chủ trọ.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmRefundModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Chưa nhận
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivedDeposit}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Đang xử lý...' : 'Đã nhận đủ 100%'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmRentalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4 text-teal-600">
              <Home className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận thuê phòng?</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Khi cả bạn và Chủ trọ cùng bấm xác nhận thuê, trạng thái lịch hẹn chuyển sang{' '}
              <strong>Hoàn tất</strong> (bạn không mất thêm bất kỳ khoản phí nào trên sàn).
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmRentalModal(false)}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleConfirmRentalDecision}
                disabled={isActionLoading}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer"
              >
                {isActionLoading ? 'Đang xử lý...' : 'Đồng ý thuê'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeclineReasonModal
        isOpen={showDeclineModal}
        isLoading={isActionLoading}
        title={
          declineType === 'DECLINE_RENTAL'
            ? 'Xác nhận không thuê phòng?'
            : 'Hủy yêu cầu xem phòng?'
        }
        description="Vui lòng nhập lý do để ghi nhận minh bạch vào phiếu đặt lịch:"
        confirmButtonText={
          declineType === 'DECLINE_RENTAL' ? 'Xác nhận không thuê' : 'Hủy yêu cầu'
        }
        onClose={() => setShowDeclineModal(false)}
        onConfirm={handleDeclineOrCancel}
      />

      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-3 text-teal-600">
              <Phone className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Liên hệ Chủ trọ</h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 my-4 text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Họ và tên:</span>
                <span className="font-bold text-slate-800">{item.tenChuTro || 'Chủ trọ'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Số điện thoại:</span>
                <span className="font-bold text-teal-600">{item.sdtChuTro || '---'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              {item.sdtChuTro && (
                <a
                  href={`tel:${item.sdtChuTro}`}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl inline-flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi ngay</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetailPage;
