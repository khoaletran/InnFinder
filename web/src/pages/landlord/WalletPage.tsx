import React, { useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmWithdrawModal } from '@/components/landlord/ConfirmWithdrawModal';
import { WithdrawModal } from '@/components/landlord/WithdrawModal';
import { landlordService } from '@/services/landlord.service';
import type { BankAccountItem } from '@/types/landlord.types';
import type { TrangThaiGD } from '@/types/transaction.types';
import { formatDateTime, formatVND } from '@/utils/formatters';

const renderTransactionStatusChip = (status: TrangThaiGD) => {
  switch (status) {
    case 'THANH_CONG':
      return (
        <Chip size="sm" color="success" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Thành công
          </Chip.Label>
        </Chip>
      );
    case 'CHO_THANH_TOAN':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Chờ thanh toán
          </Chip.Label>
        </Chip>
      );
    case 'HOAN_TIEN':
      return (
        <Chip size="sm" color="accent" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            Hoàn tiền
          </Chip.Label>
        </Chip>
      );
    case 'THAT_BAI':
    default:
      return (
        <Chip size="sm" color="danger" variant="soft">
          <Chip.Label className="inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Thất bại
          </Chip.Label>
        </Chip>
      );
  }
};

export const WalletPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountItem | null>(null);

  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['landlord', 'wallet'],
    queryFn: landlordService.getWalletInfo,
  });

  const {
    data: transactions = [],
    isLoading: txLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['landlord', 'transactions'],
    queryFn: landlordService.getTransactions,
  });

  const withdrawMutation = useMutation({
    mutationFn: ({
      soTien,
      soTaiKhoan,
      tenNganHang,
    }: {
      soTien: number;
      soTaiKhoan: string;
      tenNganHang: string;
    }) => landlordService.requestWithdraw(soTien, soTaiKhoan, tenNganHang),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'wallet'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] });
      setConfirmModalOpen(false);
      toast.success(
        'Tạo yêu cầu rút tiền thành công! Yêu cầu đang được đối soát chuyển khoản.',
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi xử lý yêu cầu rút tiền');
    },
  });

  const addBankAccountMutation = useMutation({
    mutationFn: ({
      soTaiKhoan,
      tenNganHang,
      tenChuTaiKhoan,
    }: {
      soTaiKhoan: string;
      tenNganHang: string;
      tenChuTaiKhoan?: string;
    }) => landlordService.addBankAccount(soTaiKhoan, tenNganHang, tenChuTaiKhoan),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['landlord', 'wallet'] });
      toast.success('Thêm tài khoản ngân hàng liên kết thành công!');
    },
  });

  const handleStartWithdraw = (amount: number, account: BankAccountItem) => {
    setWithdrawAmount(amount);
    setSelectedAccount(account);
    setWithdrawModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleConfirmWithdraw = () => {
    if (!selectedAccount || withdrawAmount <= 0) return;
    withdrawMutation.mutate({
      soTien: withdrawAmount,
      soTaiKhoan: selectedAccount.soTaiKhoan,
      tenNganHang: selectedAccount.tenNganHang,
    });
  };

  const handleAddAccount = async (
    soTaiKhoan: string,
    tenNganHang: string,
    tenChuTaiKhoan?: string,
  ) => {
    await addBankAccountMutation.mutateAsync({
      soTaiKhoan,
      tenNganHang,
      tenChuTaiKhoan,
    });
  };

  const handleRefresh = () => {
    void refetchWallet();
    void refetchTransactions();
    toast.success('Đã làm mới dữ liệu ví và lịch sử giao dịch');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {formatVND(wallet?.soDu ?? 0)}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setWithdrawModalOpen(true)}
              className="px-4 py-2 bg-white text-cyan-700 hover:bg-cyan-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-cyan-600" />
              <span>Rút tiền về ngân hàng</span>
            </button>
            <span className="text-[11px] text-cyan-100 font-medium">Miễn phí giao dịch</span>
          </div>
        </div>

        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Đã Nhận
            </Card.Title>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-xl font-black text-slate-900">
              {formatVND(wallet?.tongDaThu ?? 0)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium mt-2 block">
              Cọc thế chân đối soát thành công
            </span>
          </Card.Content>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Đã Rút
            </Card.Title>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-xl font-black text-slate-900">
              {formatVND(wallet?.tongDaRut ?? 0)}
            </p>
            <span className="text-[11px] text-slate-400 mt-2 block">
              Về tài khoản ngân hàng liên kết
            </span>
          </Card.Content>
        </Card>
      </div>

      {/* Linked Bank Accounts */}
      <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <Card.Header className="p-0 pb-3 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900">
              Tài Khoản Ngân Hàng Đã Liên Kết
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Dùng để nhận tiền rút tự động từ ví Chủ trọ
            </Card.Description>
          </div>
          <button
            type="button"
            onClick={() => setWithdrawModalOpen(true)}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm tài khoản</span>
          </button>
        </Card.Header>

        <Card.Content className="p-0">
          {walletLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Đang tải tài khoản ngân hàng...
            </div>
          ) : !wallet?.dsTaiKhoanNganHang || wallet.dsTaiKhoanNganHang.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
              Chưa có tài khoản ngân hàng nào được liên kết. Bấm &ldquo;Thêm tài khoản&rdquo; để liên kết ngay.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {wallet.dsTaiKhoanNganHang.map((acc, idx) => (
                <div
                  key={acc.id ?? `${acc.tenNganHang}-${acc.soTaiKhoan}-${idx}`}
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
                  <Chip size="sm" color="success" variant="soft">
                    <Chip.Label>Đã liên kết</Chip.Label>
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Ledger Transactions Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs p-0">
        <Card.Header className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900">
              Sổ Cái Biến Động Số Dư & Giao Dịch Ví
            </Card.Title>
            <Card.Description className="text-xs text-slate-500">
              Ghi nhận minh bạch mọi biến động tiền cọc thế chân, hoàn cọc và rút tiền
            </Card.Description>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </Card.Header>

        <Card.Content className="p-0 overflow-x-auto">
          {txLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600 mb-2" />
              <span className="text-xs">Đang tải lịch sử giao dịch...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa phát sinh giao dịch nào trong ví.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Mã Giao Dịch</th>
                  <th className="py-3 px-4">Nội Dung Đối Soát</th>
                  <th className="py-3 px-4">Loại Biến Động</th>
                  <th className="py-3 px-4">Số Tiền</th>
                  <th className="py-3 px-4">Trạng Thái (TrangThaiGD)</th>
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
                    <td className="py-3.5 px-4 font-black text-sm text-slate-900">
                      {formatVND(tx.thucNhan)}
                    </td>
                    <td className="py-3.5 px-4">{renderTransactionStatusChip(tx.trangThai)}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400 font-medium whitespace-nowrap">
                      {formatDateTime(tx.ngayGiaoDich)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Content>
      </Card>

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        onConfirm={handleStartWithdraw}
        availableBalance={wallet?.soDu ?? 0}
        bankAccounts={wallet?.dsTaiKhoanNganHang ?? []}
        onAddAccount={handleAddAccount}
        loading={withdrawMutation.isPending || addBankAccountMutation.isPending}
      />

      <ConfirmWithdrawModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmWithdraw}
        amount={withdrawAmount}
        account={selectedAccount}
        loading={withdrawMutation.isPending}
      />
    </div>
  );
};
