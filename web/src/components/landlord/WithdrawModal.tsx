import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Landmark, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { VIETNAM_BANKS } from '@/constants/banks';
import { useAuthStore } from '@/store/useAuthStore';
import type { BankAccountItem } from '@/types/landlord.types';
import { formatVND } from '@/utils/formatters';
import { bankAccountSchema, withdrawSchema } from '@/utils/validators';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, account: BankAccountItem) => void;
  availableBalance: number;
  bankAccounts: BankAccountItem[];
  onAddAccount?: (
    accountNumber: string,
    bankName: string,
    holderName?: string,
  ) => void | Promise<void>;
  loading?: boolean;
}

const WithdrawModalContent: React.FC<Omit<WithdrawModalProps, 'isOpen'>> = ({
  onClose,
  onConfirm,
  availableBalance,
  bankAccounts,
  onAddAccount,
  loading = false,
}) => {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState<string>('');
  const [selectedAccIdx, setSelectedAccIdx] = useState<number>(() => Math.max(0, bankAccounts.findIndex((account) => account.macDinh)));
  const [showAddAcc, setShowAddAcc] = useState(() => bankAccounts.length === 0);
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newBankName, setNewBankName] = useState(VIETNAM_BANKS[0]?.shortName || 'Vietcombank');
  const [newHolderName, setNewHolderName] = useState(() => user?.hoVaTen || '');
  const [bankError, setBankError] = useState('');
  const [error, setError] = useState('');

  const numAmount = Number(amount.replace(/\D/g, '')) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const selectedAccount = bankAccounts[selectedAccIdx];
    if (!selectedAccount?.id) {
      const msg = 'Vui lòng thêm và chọn tài khoản ngân hàng nhận tiền';
      setError(msg);
      toast.error(msg);
      return;
    }

    const sanitizedBankName = selectedAccount.tenNganHang
      .replace(/[^A-Za-zÀ-ỹ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const parsed = withdrawSchema(availableBalance).safeParse({
      soTien: numAmount,
      soTaiKhoan: selectedAccount.soTaiKhoan.trim(),
      tenNganHang: sanitizedBankName || selectedAccount.tenNganHang.trim(),
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Thông tin rút tiền không hợp lệ';
      setError(msg);
      toast.error(msg);
      return;
    }

    setError('');
    onConfirm(numAmount, {
      ...selectedAccount,
      soTaiKhoan: parsed.data.soTaiKhoan,
      tenNganHang: parsed.data.tenNganHang,
    });
  };

  const handleAddNewAccount = async () => {
    const parsed = bankAccountSchema.safeParse({
      soTaiKhoan: newAccNumber.trim(),
      tenNganHang: newBankName.trim(),
      tenChuTaiKhoan: newHolderName.trim() || undefined,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Thông tin ngân hàng không hợp lệ';
      setBankError(msg);
      toast.error(msg);
      return;
    }

    setBankError('');
    if (onAddAccount) {
      try {
        await onAddAccount(
          parsed.data.soTaiKhoan,
          parsed.data.tenNganHang,
          parsed.data.tenChuTaiKhoan,
        );
        setShowAddAcc(false);
        setNewAccNumber('');
        setSelectedAccIdx(bankAccounts.length);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể thêm tài khoản ngân hàng';
        setBankError(message);
        toast.error(message);
      }
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Rút tiền về tài khoản ngân hàng"
      subtitle="Tạo yêu cầu rút tiền để quản trị viên đối soát chuyển khoản"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || numAmount <= 0}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>Tiếp tục</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/10">
          <span className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wider block">
            Số dư ví khả dụng
          </span>
          <span className="text-2xl font-extrabold tracking-tight mt-0.5 block">
            {formatVND(availableBalance)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Số tiền muốn rút (VNĐ) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={amount ? Number(amount.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setAmount(raw);
                if (error) setError('');
              }}
              placeholder="Nhập số tiền (tối thiểu 50.000)"
              className="w-full text-sm font-bold text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              type="button"
              onClick={() => {
                setAmount(String(availableBalance));
                if (error) setError('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
            >
              Rút tất cả
            </button>
          </div>
          {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">Tài khoản nhận tiền</label>
            <button
              type="button"
              onClick={() => {
                setShowAddAcc(!showAddAcc);
                setBankError('');
              }}
              className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              {showAddAcc ? 'Chọn tài khoản đã lưu' : 'Thêm ngân hàng'}
            </button>
          </div>

          {showAddAcc ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 mb-2">
              <span className="text-xs font-bold text-slate-800 block">
                Liên kết tài khoản ngân hàng mới:
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ngân hàng
                </label>
                <select
                  value={newBankName}
                  onChange={(e) => {
                    setNewBankName(e.target.value);
                    if (bankError) setBankError('');
                  }}
                  className="w-full text-xs p-2.5 bg-white rounded-lg border border-slate-200 text-slate-800"
                >
                  {VIETNAM_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.shortName}>
                      {bank.shortName} - {bank.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Số tài khoản (6 - 20 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Nhập từ 6 đến 20 chữ số"
                  value={newAccNumber}
                  onChange={(e) => {
                    setNewAccNumber(e.target.value.replace(/\D/g, ''));
                    if (bankError) setBankError('');
                  }}
                  className="w-full text-xs p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên chủ tài khoản"
                  value={newHolderName}
                  onChange={(e) => setNewHolderName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white rounded-lg border border-slate-200 uppercase text-slate-800"
                />
              </div>
              {bankError && (
                <p className="text-[11px] text-red-500 font-medium">{bankError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                {bankAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddAcc(false)}
                    className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleAddNewAccount()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg cursor-pointer"
                >
                  Lưu tài khoản
                </button>
              </div>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              Chưa có tài khoản ngân hàng liên kết. Bấm &ldquo;Thêm ngân hàng&rdquo; để liên kết.
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((acc, idx) => (
                <div
                  key={acc.id ?? `${acc.tenNganHang}-${acc.soTaiKhoan}-${idx}`}
                  onClick={() => setSelectedAccIdx(idx)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedAccIdx === idx
                      ? 'border-cyan-500 bg-cyan-50/40 ring-1 ring-cyan-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{acc.tenNganHang}{acc.macDinh ? ' · Mặc định' : ''}</p>
                      <p className="text-[11px] font-mono text-slate-500">{acc.soTaiKhoan}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="bankAcc"
                    checked={selectedAccIdx === idx}
                    onChange={() => setSelectedAccIdx(idx)}
                    className="text-cyan-600 focus:ring-cyan-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Miễn phí rút tiền. Tiền sẽ về tài khoản ngân hàng sau khi đối soát.</span>
        </div>
      </form>
    </Modal>
  );
};

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, ...rest }) => {
  if (!isOpen) return null;
  return <WithdrawModalContent {...rest} />;
};
