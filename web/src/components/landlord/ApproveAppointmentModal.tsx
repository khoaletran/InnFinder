import React from 'react';
import { Calendar, CheckCircle2, Clock, MapPin, Phone, User } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { LandlordAppointmentItem } from '@/types/landlord.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

interface ApproveAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appointment: LandlordAppointmentItem | null;
  loading?: boolean;
}

export const ApproveAppointmentModal: React.FC<ApproveAppointmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  appointment,
  loading = false,
}) => {
  if (!appointment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận lịch xem phòng"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Đang duyệt...' : 'Xác nhận lịch xem'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">
              Cọc giữ chân lịch xem: {formatVND(appointment.coc)}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Khi dẫn xem thực tế, bạn hoàn trả trực tiếp 100% khoản cọc ({formatVND(appointment.coc)}) cho khách để chuyển quyền nhận cọc thế chân tại Sàn sang ví của bạn.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            <span>
              Khách xem phòng: <strong>{appointment.khachHangTen}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>
              Số điện thoại: <strong>{formatPhoneNumber(appointment.sdt)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              Ngày hẹn: <strong>{appointment.ngayHen}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Giờ hẹn: <strong>{appointment.thoiGian}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2 text-slate-700">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Phòng: <strong>{appointment.phongTen}</strong>
              {appointment.diaChiPhong ? ` (${appointment.diaChiPhong})` : ''}
            </span>
          </div>
        </div>

        {appointment.ghiChu && (
          <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
            <strong>Ghi chú từ khách:</strong> {appointment.ghiChu}
          </div>
        )}
      </div>
    </Modal>
  );
};
