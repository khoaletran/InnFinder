import React from 'react';
import { Chip } from '@heroui/react';
import {
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Eye,
  Mail,
  MapPin,
  Phone,
  User,
  XCircle,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { LandlordAppointmentItem } from '@/types/landlord.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: LandlordAppointmentItem | null;
  onApprove?: (id: string) => void;
  onCancel?: (id: string) => void;
  onConfirmDepositRefunded?: (id: string) => void;
}

const renderDecisionText = (val: boolean | null | undefined, agree: string, decline: string) => {
  if (val === true) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {agree}
      </span>
    );
  }
  if (val === false) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
        <XCircle className="w-3.5 h-3.5" />
        {decline}
      </span>
    );
  }
  return <span className="text-amber-600 font-semibold">Chờ xác nhận</span>;
};

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onApprove,
  onCancel,
  onConfirmDepositRefunded,
}) => {
  if (!appointment) return null;

  const getStatusBadge = (status: LandlordAppointmentItem['trangThai']) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return (
          <Chip size="sm" color="warning" variant="soft">
            <Chip.Label>Chờ xác nhận</Chip.Label>
          </Chip>
        );
      case 'XAC_NHAN':
        return (
          <Chip size="sm" color="accent" variant="soft">
            <Chip.Label>Đã xác nhận</Chip.Label>
          </Chip>
        );
      case 'HOAN_THANH':
        return (
          <Chip size="sm" color="success" variant="soft">
            <Chip.Label>Hoàn thành</Chip.Label>
          </Chip>
        );
      case 'HUY':
        return (
          <Chip size="sm" color="danger" variant="soft">
            <Chip.Label>Đã hủy</Chip.Label>
          </Chip>
        );
      default:
        return null;
    }
  };

  const cocAmount = appointment.coc ?? 0;
  const phiThuAmount = appointment.phiThu ?? 0;

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
            {appointment.trangThai === 'XAC_NHAN' && !appointment.daNhanLaiCoc && onConfirmDepositRefunded && (
              <button
                type="button"
                onClick={() => {
                  onConfirmDepositRefunded(appointment.id);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
                <span>Xác nhận đã trả cọc</span>
              </button>
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
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mã lịch hẹn: #{appointment.id}
            </span>
            <h4 className="text-sm font-bold text-slate-800 mt-0.5">{appointment.phongTen}</h4>
          </div>
          {getStatusBadge(appointment.trangThai)}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <User className="w-4 h-4 text-cyan-600" />
            <span>
              Khách hàng: <strong>{appointment.khachHangTen}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Phone className="w-4 h-4 text-cyan-600" />
            <span>
              Số điện thoại: <strong>{formatPhoneNumber(appointment.sdt)}</strong>
            </span>
          </div>
          {appointment.emailKhachHang && (
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="w-4 h-4 text-cyan-600" />
              <span>
                Email: <strong>{appointment.emailKhachHang}</strong>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-slate-700">
            <Calendar className="w-4 h-4 text-cyan-600" />
            <span>
              Ngày xem: <strong>{appointment.ngayHen}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span>
              Thời gian: <strong>{appointment.thoiGian}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-700">
            <MapPin className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <span>Địa chỉ phòng: {appointment.diaChiPhong || 'Đang cập nhật'}</span>
          </div>
        </div>

        <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-900">
              <CircleDollarSign className="w-4 h-4 text-cyan-600" />
              <span>Cọc giữ chân lịch xem:</span>
            </div>
            <span className="font-extrabold text-cyan-800 text-sm">
              {formatVND(cocAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-cyan-100/80">
            <span>Phí hoa hồng sàn (nếu chốt thuê):</span>
            <span className="font-bold text-slate-800">{formatVND(phiThuAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Trạng thái hoàn cọc trực tiếp:</span>
            {appointment.daNhanLaiCoc ? (
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Khách hàng đã nhận lại cọc
              </span>
            ) : (
              <span className="font-bold text-amber-700">
                Chờ đối soát cọc thế chân
              </span>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
          <span className="font-bold text-slate-700 block mb-1">
            Quyết định độc lập hai bên:
          </span>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Khách hàng:</span>
            {renderDecisionText(appointment.khachHangDongY, 'Đồng ý thuê', 'Không thuê')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Chủ trọ:</span>
            {renderDecisionText(appointment.chuTroDongY, 'Đồng ý cho thuê', 'Từ chối cho thuê')}
          </div>
        </div>

        {appointment.ghiChu && (
          <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-1">Ghi chú của khách:</span>
            <p className="text-slate-600">{appointment.ghiChu}</p>
          </div>
        )}

        {appointment.lyDoHuy && (
          <div className="text-xs bg-rose-50 p-3 rounded-xl border border-rose-100 text-rose-700">
            <span className="font-bold block mb-1">Lý do hủy / từ chối:</span>
            <p>{appointment.lyDoHuy}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
