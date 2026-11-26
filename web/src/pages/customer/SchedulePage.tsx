import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Coins,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookingSuccessModal } from '@/components/booking/BookingSuccessModal';
import { CancelConfirmModal } from '@/components/booking/CancelConfirmModal';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { appointmentService } from '@/services/appointment.service';
import { roomService } from '@/services/room.service';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { formatVND, formatVNDShort } from '@/utils/formatters';
import { REGEX_PATTERNS } from '@/utils/validators';

export const SchedulePage: React.FC = () => {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchAppointments } = useBookingStore();

  const roomId = paramRoomId || searchParams.get('roomId') || '';
  const paramTitle = searchParams.get('title');
  const paramPrice = searchParams.get('price');
  const paramImage = searchParams.get('image');

  const getInitialDate = () => {
    const today = new Date();
    if (today.getHours() >= 17) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    return today.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate);
  const [selectedTime, setSelectedTime] = useState<string>('09:30');
  const [phoneNumberDraft, setPhoneNumber] = useState<string | null>(null);
  const phoneNumber = phoneNumberDraft ?? user?.sdt ?? '';
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [isCustomTimeModalOpen, setIsCustomTimeModalOpen] = useState<boolean>(false);
  const [submittedDateTime, setSubmittedDateTime] = useState<string>('');

  const { data: roomData } = useQuery({
    queryKey: ['rooms', 'detail', roomId],
    queryFn: () => roomService.getRoomDetail(roomId),
    enabled: !!roomId,
  });

  const { data: bookedSlotsData } = useQuery({
    queryKey: ['booked-slots', roomId, selectedDate],
    queryFn: () => appointmentService.getBookedSlots(roomId, selectedDate),
    enabled: !!roomId && !!selectedDate,
    refetchInterval: 30_000,
  });

  const { data: myAppointments = [] } = useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: appointmentService.getMyAppointments,
    enabled: !!user,
  });

  const existingRoomAppointment = myAppointments.find(
    (a) =>
      a.maPhongTro === roomId &&
      (a.trangThai === 'CHO_XAC_NHAN' || a.trangThai === 'XAC_NHAN'),
  );

  const bookedDateTimes = bookedSlotsData?.bookedDateTimes ?? [];
  const bookedTimesOnDate = bookedSlotsData?.bookedTimes ?? [];
  const bufferMinutes = bookedSlotsData?.bufferMinutes ?? 120;

  const displayImage =
    paramImage ||
    roomData?.dsHinhAnh?.find((img) => img.laDaiDien)?.url ||
    roomData?.dsHinhAnh?.[0]?.url ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600';

  const displayTitle =
    paramTitle ||
    roomData?.tieuDe ||
    roomData?.tenPhong ||
    roomData?.moTa?.slice(0, 50) ||
    `Phòng trọ mã #${roomId}`;

  const displayAddress = roomData?.diaChi || 'Đang tải địa chỉ phòng trọ...';

  const displayPrice = roomData?.giaThue
    ? formatVNDShort(roomData.giaThue)
    : paramPrice
      ? formatVNDShort(Number(paramPrice))
      : 'Thỏa thuận';

  const roomCategoryName =
    roomData?.loaiPhong?.tenLoaiPhongTro || roomData?.loaiPhong?.tenLoaiPhong || 'Phòng trọ';

  const depositAmount = roomData?.loaiPhong?.soTienCoc ?? 200_000;

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  const isTomorrow = (dateStr: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateStr === tomorrow.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!roomId) {
      setErrorMessage('Vui lòng chọn phòng trọ cần đặt lịch xem từ trang Tìm kiếm.');
      return;
    }

    if (!selectedDate || !selectedTime) {
      setErrorMessage('Vui lòng chọn ngày và giờ hẹn xem phòng.');
      return;
    }

    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const appointmentDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    const minValidTime = Date.now() + 3 * 60 * 60 * 1000;
    if (appointmentDateTime.getTime() < minValidTime) {
      setErrorMessage(
        'Thời gian hẹn xem phòng phải sau thời điểm hiện tại ít nhất 3 giờ để Chủ trọ kịp sắp xếp và duyệt đơn. Vui lòng chọn lại!',
      );
      return;
    }

    const bufferMs = bufferMinutes * 60 * 1000;
    const hasConflict = bookedDateTimes.some((rawDt) => {
      const bookedMs = new Date(rawDt).getTime();
      return !Number.isNaN(bookedMs) && Math.abs(appointmentDateTime.getTime() - bookedMs) < bufferMs;
    });
    if (hasConflict) {
      setErrorMessage(
        'Khung giờ bạn chọn đang có khách đặt hoặc nằm trong khoảng đệm 2 giờ quanh lịch khác. Vui lòng chọn khung giờ sáng (khả dụng) khác!',
      );
      return;
    }

    // Đồng bộ chuẩn Regex SĐT AGENTS.md (03|05|07|08|09 + 8 số HOẶC +84 + 9 số)
    if (!REGEX_PATTERNS.PHONE.test(phoneNumber.trim())) {
      setErrorMessage(
        'Số điện thoại không hợp lệ (đầu số 03, 05, 07, 08, 09 gồm 10 số hoặc +84 gồm 9 số).',
      );
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const isoString = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
    const formattedDateDisplay = `${pad(day)}/${pad(month)}/${year} lúc ${pad(hours)}:${pad(minutes)}`;
    setSubmittedDateTime(formattedDateDisplay);

    setIsSubmitting(true);
    try {
      const response = await appointmentService.createAppointment({
        maPhongTro: roomId,
        ngayHen: isoString,
        ghiChu: note.trim() || undefined,
      });

      await fetchAppointments(true);
      setIsSubmitting(false);

      const createdAppointmentId = response?.maDatLich;
      const coc = response?.coc ?? depositAmount;

      if (coc > 0 && createdAppointmentId) {
        toast.info('Đã tạo phiếu hẹn! Đang chuyển sang bước nộp cọc giữ chân để hoàn tất...');
        navigate(`/appointments/deposit/${createdAppointmentId}`, {
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
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Không thể gửi yêu cầu đặt lịch. Vui lòng thử lại.',
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Đặt lịch xem phòng
              </h1>
              <p className="text-xs text-slate-500">
                Gặp trực tiếp chủ trọ để khảo sát chất lượng phòng thực tế
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {existingRoomAppointment && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-rose-950">
                    Bạn đã có lịch hẹn đang hoạt động cho phòng trọ này (#{existingRoomAppointment.maDatLich})
                  </p>
                  <p className="text-rose-800 leading-relaxed">
                    Mỗi khách hàng chỉ được giữ tối đa 1 lịch hẹn đang hoạt động cho mỗi phòng trọ (trừ khi lịch trước đó đã bị hủy). Bạn vẫn có thể đặt lịch cho các phòng trọ khác bình thường.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/appointments/${existingRoomAppointment.maDatLich}`)}
                className="shrink-0 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer self-start sm:self-center"
              >
                Xem lịch hẹn này
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-full sm:w-28 h-24 object-cover rounded-lg bg-slate-200"
            />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-teal-100 text-teal-700">
                    {roomCategoryName}
                  </span>
                  {roomId && <span className="text-xs text-slate-400 font-mono">#{roomId}</span>}
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
                  Giá thuê:{' '}
                  <strong className="text-sm font-bold text-teal-600">{displayPrice}</strong>
                </div>
                <div className="text-xs flex items-center gap-1 text-slate-600">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  Cọc giữ chân theo loại phòng:{' '}
                  <strong className="text-amber-700 font-bold">
                    {depositAmount > 0 ? formatVND(depositAmount) : 'Miễn cọc'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Ngày xem phòng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800"
                />

                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      isToday(selectedDate)
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      isTomorrow(selectedDate)
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Giờ hẹn chính xác (24h) <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => setIsCustomTimeModalOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm bg-white border border-slate-200 hover:border-teal-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-left cursor-pointer transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                    {selectedTime ? (
                      <span className="font-bold text-slate-900 font-mono text-base">
                        {selectedTime}{' '}
                        <span className="text-xs font-semibold text-teal-600 font-sans">
                          (Hệ 24h)
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Chọn giờ hẹn theo hệ 24h</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors">
                    Chọn giờ cụ thể
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Khung giờ dẫn khách hoạt động từ 07:00 đến 21:00. Cách hiện tại tối thiểu 3 tiếng.
                </p>
              </div>
            </div>

            {bookedTimesOnDate.length > 0 && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold text-amber-950">
                    {bookedTimesOnDate.length === 1 ? (
                      <>
                        Phòng đã có lịch hẹn vào lúc{' '}
                        <span className="font-mono">{bookedTimesOnDate[0]}</span> ngày{' '}
                        {selectedDate.split('-').reverse().join('/')}
                      </>
                    ) : (
                      <>
                        Phòng đã có {bookedTimesOnDate.length} lịch hẹn vào lúc{' '}
                        <span className="font-mono">
                          {bookedTimesOnDate.slice(0, -1).join(', ')} và{' '}
                          {bookedTimesOnDate[bookedTimesOnDate.length - 1]}
                        </span>{' '}
                        ngày {selectedDate.split('-').reverse().join('/')}
                      </>
                    )}
                  </p>
                  <p className="text-amber-800">
                    Các khung giờ gần thời gian này hiện tạm thời không khả dụng để tránh trùng
                    lịch và đảm bảo phòng được sắp xếp đúng thời gian.
                  </p>
                </div>
              </div>
            )}

            <TimeSlotPicker
              selectedTime={selectedTime}
              onSelectTime={(time) => setSelectedTime(time)}
              selectedDate={selectedDate}
              bookedDateTimes={bookedDateTimes}
              bufferMinutes={bufferMinutes}
              isCustomModalOpen={isCustomTimeModalOpen}
              setIsCustomModalOpen={setIsCustomTimeModalOpen}
            />
          </div>

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
                placeholder="VD: 0987654321 hoặc +84987654321"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={12}
                required
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Ghi chú cho chủ trọ (Tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder="Ví dụ: Tôi muốn xem kỹ khu bếp, chỗ để xe máy và hỏi về nội quy giờ giấc..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={255}
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-800 resize-none"
            />
          </div>

          <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-4 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Quyền lợi & Cam kết giữ lịch xem phòng</span>
            </div>
            <div className="space-y-1.5 text-slate-700 leading-relaxed">
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-teal-700 shrink-0">•</span>
                <span>
                  <strong>Cam kết khung giờ:</strong> Chủ trọ đã dành riêng khung giờ hẹn này để đón tiếp bạn và không nhận khách nào khác trùng giờ.
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-teal-700 shrink-0">•</span>
                <span>
                  <strong>Cơ chế phòng mở:</strong> Từ nay đến ngày hẹn của bạn, phòng trọ vẫn tiếp tục đón các khách có lịch xem ở những ngày sớm hơn.
                </span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="font-bold text-teal-700 shrink-0">•</span>
                <span>
                  <strong>Bảo đảm an toàn cọc 100%:</strong> Nếu phòng được khách xem sớm hơn chốt thuê, InnFinder sẽ thông báo ngay và tự động hoàn 100% cọc giữ chân để bạn không mất công di chuyển.
                </span>
              </p>
            </div>
          </div>

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
              disabled={isSubmitting || Boolean(existingRoomAppointment)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <span>Đang gửi yêu cầu...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gửi yêu cầu đặt lịch</span>
                </>
              )}
            </button>
          </div>
        </form>
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
        title="Đã gửi yêu cầu đặt lịch"
        dateTimeText={submittedDateTime}
        landlordName={roomData?.chuTro?.hoVaTen || roomData?.chuTro?.hoTen || 'Chủ trọ'}
      />

      <CancelConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={() => {
          setShowCancelModal(false);
          navigate(roomId ? `/room/${roomId}` : '/appointments');
        }}
        title="Hủy đặt lịch?"
        description="Bạn có chắc chắn muốn thoát khỏi biểu mẫu đặt lịch hẹn này?"
        cancelButtonText="Thoát"
        keepButtonText="Tiếp tục điền"
        requireReason={false}
      />
    </div>
  );
};

export default SchedulePage;
