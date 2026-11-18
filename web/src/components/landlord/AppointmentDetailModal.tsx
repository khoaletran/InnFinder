import React from 'react';
import { Modal } from '../common/Modal';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CircleDollarSign,
  Eye,
} from 'lucide-react';
import type { LandlordAppointmentItem } from '../../types/landlord.types';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: LandlordAppointmentItem | null;
  onApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onApprove,
  onCancel,
}) => {
  if (!appointment) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">Chờ xác nhận</span>;
      case 'XAC_NHAN':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-700">Đã xác nhận</span>;
      case 'HOAN_THANH':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">Hoàn thành</span>;
      case 'HUY':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">Đã hủy</span>;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết lịch xem phòng"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {appointment.trangThai === 'CHO_XAC_NHAN' && (
              <div className="flex items-center gap-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCancel(appointment.id);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Từ chối
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApprove(appointment.id);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Duyệt lịch</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top summary */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mã lịch hẹn: #{appointment.id}
            </span>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{appointment.phongTen}</h4>
          </div>
          {getStatusBadge(appointment.trangThai)}
        </div>

        {/* Guest info */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <User className="w-4 h-4 text-cyan-600" />
            <span>Khách hàng: <strong>{appointment.khachHangTen}</strong></span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Phone className="w-4 h-4 text-cyan-600" />
            <span>Số điện thoại: <strong>{appointment.sdt}</strong></span>
          </div>
          {appointment.emailKhachHang && (
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="w-4 h-4 text-cyan-600" />
              <span>Email: <strong>{appointment.emailKhachHang}</strong></span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-slate-700">
            <Calendar className="w-4 h-4 text-cyan-600" />
            <span>Ngày xem: <strong>{appointment.ngayHen}</strong></span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span>Thời gian: <strong>{appointment.thoiGian}</strong></span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-700">
            <MapPin className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <span>Địa chỉ phòng: {appointment.diaChiPhong || '123 Đường D2, Bình Thạnh, TP.HCM'}</span>
          </div>
        </div>

        {/* Deposit details */}
        <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-cyan-900">
            <CircleDollarSign className="w-4 h-4 text-cyan-600" />
            <span>Cọc giữ chân lịch xem:</span>
          </div>
          <span className="font-extrabold text-cyan-800 text-sm">
            {appointment.coc?.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {appointment.ghiChu && (
          <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-1">Ghi chú của khách:</span>
            <p className="text-slate-600">{appointment.ghiChu}</p>
          </div>
        )}

        {appointment.lyDoHuy && (
          <div className="text-xs bg-rose-50 p-3 rounded-xl border border-rose-100 text-rose-700">
            <span className="font-bold block mb-1">Lý do hủy hẹn:</span>
            <p>{appointment.lyDoHuy}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
