import React from "react";
import { CheckCircle2, X } from "lucide-react";

export interface BookingSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewAppointments: () => void;
  title?: string;
  dateTimeText?: string; // Ví dụ: "28/09/2026 lúc 18:30"
  landlordName?: string; // Ví dụ: "Minh Anh" hoặc "Trần Văn Hùng"
  message?: string;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewAppointments,
  title = "Đặt lịch thành công",
  dateTimeText = "28/09/2026 lúc 18:30",
  landlordName = "Minh Anh",
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon thành công viền tròn xanh lá */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
        </div>

        {/* Tiêu đề */}
        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
          {title}
        </h3>

        {/* Nội dung thông báo */}
        <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto mb-8 font-normal">
          {message || (
            <>
              Lịch {dateTimeText} đã được gửi đến chủ trọ {landlordName}.
            </>
          )}
        </p>

        {/* Nút Xem lịch hẹn góc phải */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onViewAppointments}
            className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
          >
            Xem lịch hẹn
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessModal;
