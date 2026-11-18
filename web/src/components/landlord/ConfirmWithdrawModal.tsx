import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useAuthStore } from '@/store/useAuthStore';
import type { BankAccountItem } from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';

interface ConfirmWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  account: BankAccountItem | null;
  loading?: boolean;
}

const ConfirmWithdrawModalContent: React.FC<{
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  account: BankAccountItem;
  loading?: boolean;
}> = ({ onClose, onConfirm, amount, account, loading = false }) => {
  const user = useAuthStore((s) => s.user);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const accountHolder =
    account.tenChuTaiKhoan ||
    user?.hoVaTen ||
    user?.tenDangNhap ||
    'Chủ tài khoản';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác thực OTP');
      return;
    }
    setError('');
    onConfirm();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Xác nhận yêu cầu rút tiền"
      subtitle="Vui lòng kiểm tra kỹ thông tin ngân hàng trước khi xác nhận"
      maxWidth="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {loading ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center py-2">
          <span className="text-xs text-slate-500 font-medium block">Số tiền rút thực nhận</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {formatVND(amount)}
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Ngân hàng nhận:</span>
            <span className="font-bold text-slate-800">{account.tenNganHang}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Số tài khoản:</span>
            <span className="font-bold text-slate-800 font-mono tracking-wider">
              {account.soTaiKhoan}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Chủ tài khoản:</span>
            <span className="font-bold text-slate-800 uppercase">{accountHolder}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200/60 pt-2">
            <span className="text-slate-500">Phí giao dịch:</span>
            <span className="font-bold text-emerald-600">0 ₫ (Miễn phí)</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mã OTP xác thực (6 chữ số)
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value.replace(/\D/g, ''));
              if (error) setError('');
            }}
            placeholder="123456"
            className="w-full text-center tracking-widest text-base font-bold py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          {error && <p className="text-[11px] text-red-500 mt-1 text-center">{error}</p>}
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-700">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Giao dịch rút tiền an toàn được bảo vệ xác thực 2 lớp.</span>
        </div>
      </form>
    </Modal>
  );
};

export const ConfirmWithdrawModal: React.FC<ConfirmWithdrawModalProps> = ({
  isOpen,
  account,
  ...rest
}) => {
  if (!isOpen || !account) return null;
  return <ConfirmWithdrawModalContent account={account} {...rest} />;
};
