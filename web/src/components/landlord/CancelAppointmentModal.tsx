import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { LandlordAppointmentItem } from '@/types/landlord.types';

interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  appointment: LandlordAppointmentItem | null;
  loading?: boolean;
}

const CancelAppointmentModalContent: React.FC<{
  onClose: () => void;
  onConfirm: (reason: string) => void;
  appointment: LandlordAppointmentItem;
  loading?: boolean;
}> = ({ onClose, onConfirm, appointment, loading = false }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối / hủy lịch');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Từ chối / Hủy lịch xem phòng"
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
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            {loading ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-600">
          Bạn đang yêu cầu từ chối / hủy lịch hẹn của khách{' '}
          <strong className="text-slate-800">{appointment.khachHangTen}</strong> vào lúc{' '}
          <strong>
            {appointment.thoiGian} {appointment.ngayHen}
          </strong>
          .
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Lý do hủy lịch hẹn <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Ví dụ: Phòng vừa có khách cọc trước, chủ bận đột xuất vào khung giờ này..."
            className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 placeholder-slate-400"
          />
          {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
        </div>

        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800">
          Tiền cọc giữ chân của khách (nếu đã nộp) sẽ được hệ thống hoàn trả 100% về ví của khách hàng.
        </div>
      </form>
    </Modal>
  );
};

export const CancelAppointmentModal: React.FC<CancelAppointmentModalProps> = ({
  isOpen,
  appointment,
  ...rest
}) => {
  if (!isOpen || !appointment) return null;
  return <CancelAppointmentModalContent appointment={appointment} {...rest} />;
};
