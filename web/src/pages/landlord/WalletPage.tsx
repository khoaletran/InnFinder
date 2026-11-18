import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Landmark,
  CheckCircle2,
  Clock,
  Plus,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import type {
  LandlordWalletInfo,
  LandlordTransactionItem,
  BankAccountItem,
} from '../../types/landlord.types';
import { WithdrawModal } from '../../components/landlord/WithdrawModal';
import { ConfirmWithdrawModal } from '../../components/landlord/ConfirmWithdrawModal';
import { toast } from 'sonner';

export const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<LandlordWalletInfo | null>(null);
  const [transactions, setTransactions] = useState<LandlordTransactionItem[]>([]);

  // Modals state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const [walletData, txData] = await Promise.all([
        landlordService.getWalletInfo(),
        landlordService.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch {
      // fallback
    }
  };

  const handleStartWithdraw = (amount: number, account: BankAccountItem) => {
    setWithdrawAmount(amount);
    setSelectedAccount(account);
    setWithdrawModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedAccount || withdrawAmount <= 0) return;
    setActionLoading(true);
    try {
      await landlordService.requestWithdraw(
        withdrawAmount,
        selectedAccount.soTaiKhoan,
        selectedAccount.tenNganHang
      );
      setConfirmModalOpen(false);
      toast.success('Tạo yêu cầu rút tiền thành công! Tiền sẽ được chuyển về tài khoản của bạn.');
      loadWalletData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý rút tiền');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAccount = async (soTaiKhoan: string, tenNganHang: string) => {
    const newAcc = await landlordService.addBankAccount(soTaiKhoan, tenNganHang);
    setWallet((prev) =>
      prev ? { ...prev, dsTaiKhoanNganHang: [...prev.dsTaiKhoanNganHang, newAcc] } : prev
    );
    toast.success('Thêm tài khoản ngân hàng thành công!');
  };

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Wallet Card */}
        <div className="md:col-span-2 bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-600 p-6 rounded-3xl text-white shadow-lg shadow-cyan-600/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                Số Dư Khả Dụng
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-black mt-2 tracking-tight">
              {wallet?.soDu ? wallet.soDu.toLocaleString('vi-VN') : '0'} đ
            </p>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setWithdrawModalOpen(true)}
              className="px-4 py-2 bg-white text-cyan-700 hover:bg-cyan-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-cyan-600" />
              <span>Rút tiền về ngân hàng</span>
            </button>
            <span className="text-[11px] text-cyan-100 font-medium">Miễn phí giao dịch</span>
          </div>
        </div>

        {/* Card 2: Tổng đã thu */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tổng Đã Nhận
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-slate-900 mt-2">
              {wallet?.tongDaThu ? wallet.tongDaThu.toLocaleString('vi-VN') : '0'} đ
            </p>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-2">
            Từ các giao dịch chốt thuê thành công
          </span>
        </div>

        {/* Card 3: Tổng đã rút */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tổng Đã Rút
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-slate-900 mt-2">
              {wallet?.tongDaRut ? wallet.tongDaRut.toLocaleString('vi-VN') : '0'} đ
            </p>
          </div>
          <span className="text-[11px] text-slate-400 mt-2">Về tài khoản ngân hàng liên kết</span>
        </div>
      </div>

      {/* Linked Bank Accounts list */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tài Khoản Ngân Hàng Đã Liên Kết</h3>
            <p className="text-xs text-slate-500">Dùng để nhận tiền rút tự động từ ví hệ thống</p>
          </div>
          <button
            onClick={() => setWithdrawModalOpen(true)}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm tài khoản</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wallet?.dsTaiKhoanNganHang.map((acc, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-100/60 text-cyan-700 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{acc.tenNganHang}</h4>
                  <p className="text-[11px] font-mono font-semibold text-slate-500">
                    {acc.soTaiKhoan}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Đã xác thực
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Lịch Sử Biến Động Số Dư & Giao Dịch</h3>
            <p className="text-xs text-slate-500">Ghi nhận minh bạch mọi biến động tiền cọc và rút tiền</p>
          </div>
          <button
            onClick={loadWalletData}
            className="p-2 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Giao Dịch</th>
                <th className="py-3 px-4">Nội Dung / Khách Hàng</th>
                <th className="py-3 px-4">Loại Giao Dịch</th>
                <th className="py-3 px-4">Số Tiền Biến Động</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thời Gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                    #{tx.maGiaoDich}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 block">{tx.khachHangTen}</span>
                    <span className="text-[11px] text-slate-500 block">{tx.phongTen}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {tx.loaiGiaoDich === 'DA_THU' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Nhận cọc thế chân
                      </span>
                    ) : tx.loaiGiaoDich === 'RUT_TIEN' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Rút về ngân hàng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-600">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Hoàn tiền cọc
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-black text-sm">
                    {tx.loaiGiaoDich === 'RUT_TIEN' ? (
                      <span className="text-amber-600">-{tx.thucNhan.toLocaleString('vi-VN')} đ</span>
                    ) : (
                      <span className="text-emerald-600">+{tx.thucNhan.toLocaleString('vi-VN')} đ</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {tx.trangThai === 'THANH_CONG' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        Thành công
                      </span>
                    ) : tx.trangThai === 'CHO_THANH_TOAN' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3" />
                        Đang xử lý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700">
                        Hoàn tất
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 font-medium">
                    {tx.ngayGiaoDich}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onConfirm={handleStartWithdraw}
        availableBalance={wallet?.soDu || 0}
        bankAccounts={wallet?.dsTaiKhoanNganHang || []}
        onAddAccount={handleAddAccount}
        loading={actionLoading}
      />

      <ConfirmWithdrawModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmWithdraw}
        amount={withdrawAmount}
        account={selectedAccount}
        loading={actionLoading}
      />
    </div>
  );
};
