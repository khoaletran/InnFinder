import React from 'react';
import { ArrowRight, ShieldCheck, CreditCard, X } from 'lucide-react';
import { formatVND } from '@/utils/formatters';

export interface RefundSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewTransactions: () => void;
  maDatLich?: string;
  depositAmount?: number;
  bankName?: string;
  accountNumber?: string;
  message?: string;
}

export const RefundSuccessModal: React.FC<RefundSuccessModalProps> = ({
  isOpen,
  onClose,
  onViewTransactions,
  maDatLich,
  depositAmount,
  bankName,
  accountNumber,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon huy hiệu xanh lá */}
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
          Yêu cầu hoàn tiền đã được gửi đi!
        </h3>

        {depositAmount && depositAmount > 0 ? (
          <div className="my-3 py-2 px-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl inline-block">
            <span className="text-xs text-emerald-700 block font-medium">Số tiền hoàn cọc dự kiến</span>
            <span className="text-xl font-black text-emerald-800">{formatVND(depositAmount)}</span>
          </div>
        ) : null}

        <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto mb-4 font-normal">
          {message || (
            <>
              Lịch hẹn xem phòng{maDatLich ? ` (${maDatLich})` : ''} đã được hủy hợp lệ. Yêu cầu hoàn cọc đã được chuyển tới Ban quản trị InnFinder để đối soát và chuyển khoản về tài khoản của bạn.
            </>
          )}
        </p>

        {bankName && accountNumber && (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-600 mb-5 text-left flex items-start gap-2.5">
            <CreditCard className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 block">Tài khoản thụ hưởng:</span>
              <span>{bankName} - <strong className="font-mono text-slate-900">{accountNumber}</strong></span>
            </div>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-left text-[11px] text-amber-800 mb-6 leading-relaxed">
          <p>
            💡 <strong>Lưu ý:</strong> Vui lòng theo dõi trạng thái tại mục <strong>Sổ cái giao dịch</strong> để nhận thông báo ngay khi tiền về tài khoản ngân hàng của bạn.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onViewTransactions}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Đến Sổ cái giao dịch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundSuccessModal;
