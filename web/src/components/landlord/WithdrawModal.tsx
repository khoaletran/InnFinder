import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Landmark, ArrowRight, AlertCircle, Plus } from 'lucide-react';
import type { BankAccountItem } from '../../types/landlord.types';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, account: BankAccountItem) => void;
  availableBalance: number;
  bankAccounts: BankAccountItem[];
  onAddAccount?: (accountNumber: string, bankName: string) => void;
  loading?: boolean;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableBalance,
  bankAccounts,
  onAddAccount,
  loading = false,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedAccIdx, setSelectedAccIdx] = useState<number>(0);
  const [showAddAcc, setShowAddAcc] = useState(false);
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newBankName, setNewBankName] = useState('Vietcombank');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const numAmount = Number(amount.replace(/\D/g, '')) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount < 50000) {
      setError('Số tiền rút tối thiểu là 50.000 VNĐ');
      return;
    }
    if (numAmount > availableBalance) {
      setError('Số tiền rút vượt quá số dư khả dụng');
      return;
    }
    const selectedAccount = bankAccounts[selectedAccIdx];
    if (!selectedAccount) {
      setError('Vui lòng chọn tài khoản ngân hàng nhận tiền');
      return;
    }
    setError('');
    onConfirm(numAmount, selectedAccount);
  };

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNumber.trim()) return;
    if (onAddAccount) {
      onAddAccount(newAccNumber.trim(), newBankName);
      setShowAddAcc(false);
      setNewAccNumber('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rút tiền về tài khoản ngân hàng"
      subtitle="Chuyển khoản nhanh 24/7 qua hệ thống liên ngân hàng Napas"
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
        {/* Available balance card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/10">
          <span className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wider block">
            Số dư ví khả dụng
          </span>
          <span className="text-2xl font-extrabold tracking-tight mt-0.5 block">
            {availableBalance.toLocaleString('vi-VN')} đ
          </span>
        </div>

        {/* Input amount */}
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
              placeholder="Nhập số tiền (VD: 500.000)"
              className="w-full text-sm font-bold text-slate-800 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              type="button"
              onClick={() => setAmount(String(availableBalance))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
            >
              Rút tất cả
            </button>
          </div>
          {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
        </div>

        {/* Bank account selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">Tài khoản nhận tiền</label>
            <button
              type="button"
              onClick={() => setShowAddAcc(!showAddAcc)}
              className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Thêm ngân hàng
            </button>
          </div>

          {showAddAcc ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 mb-2">
              <span className="text-xs font-bold text-slate-800 block">Thêm tài khoản mới:</span>
              <input
                type="text"
                placeholder="Số tài khoản ngân hàng"
                value={newAccNumber}
                onChange={(e) => setNewAccNumber(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200"
              />
              <select
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-slate-200"
              >
                <option value="Vietcombank">Vietcombank</option>
                <option value="MB Bank (Quân Đội)">MB Bank</option>
                <option value="Techcombank">Techcombank</option>
                <option value="BIDV">BIDV</option>
                <option value="VietinBank">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="TPBank">TPBank</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddAcc(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddNewAccount}
                  className="px-3 py-1 text-xs font-bold text-white bg-cyan-600 rounded-lg"
                >
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((acc, idx) => (
                <div
                  key={idx}
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
                      <p className="text-xs font-bold text-slate-800">{acc.tenNganHang}</p>
                      <p className="text-[11px] text-slate-500">{acc.soTaiKhoan}</p>
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
          <span>Miễn phí rút tiền. Tiền sẽ về tài khoản trong vòng 5 - 15 phút.</span>
        </div>
      </form>
    </Modal>
  );
};
