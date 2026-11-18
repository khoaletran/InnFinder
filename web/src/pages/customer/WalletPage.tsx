import React, { useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  CreditCard,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { BANKS } from '@/constants/banks';
import { authUserService } from '@/services/authUser.service';
import { transactionService } from '@/services/transaction.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateTime, formatVND, getTransactionStatusBadge } from '@/utils/formatters';
import { bankAccountSchema } from '@/utils/validators';

export const WalletPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isChuTro } = useAuthStore();

  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [tenNganHang, setTenNganHang] = useState(BANKS[0]?.shortName || 'Vietcombank');
  const [soTaiKhoan, setSoTaiKhoan] = useState('');
  const [tenChuTaiKhoan, setTenChuTaiKhoan] = useState('');

  const { data: bankAccounts = [], isLoading: loadingBanks } = useQuery({
    queryKey: ['users', 'bank-accounts'],
    queryFn: authUserService.getMyBankAccounts,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', 'my-history'],
    queryFn: transactionService.getMyTransactions,
  });

  const { data: landlordWallet } = useQuery({
    queryKey: ['landlord', 'wallet'],
    queryFn: transactionService.getLandlordWallet,
    enabled: isChuTro,
  });

  const addBankMutation = useMutation({
    mutationFn: authUserService.addBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      toast.success('Đã liên kết tài khoản ngân hàng thành công');
      setIsAddBankOpen(false);
      setSoTaiKhoan('');
      setTenChuTaiKhoan('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Không thể thêm tài khoản ngân hàng');
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: authUserService.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      toast.success('Đã hủy liên kết tài khoản ngân hàng');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa tài khoản ngân hàng');
    },
  });

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bankAccountSchema.safeParse({
      soTaiKhoan: soTaiKhoan.trim(),
      tenNganHang: tenNganHang.trim(),
      tenChuTaiKhoan: tenChuTaiKhoan.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Thông tin tài khoản ngân hàng chưa hợp lệ');
      return;
    }
    addBankMutation.mutate(parsed.data);
  };

  const escrowActiveTotal = transactions
    .filter((t) => t.loaiGiaoDich === 'COC_XEM_PHONG' && t.trangThai === 'THANH_CONG')
    .reduce((sum, t) => sum + t.soTien, 0);

  const refundedTotal = transactions
    .filter((t) => t.trangThai === 'HOAN_TIEN' || t.loaiGiaoDich === 'HOAN_COC')
    .reduce((sum, t) => sum + t.soTien, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản lý Ví & Tài khoản Ngân hàng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách ngân hàng nhận hoàn cọc (`TaiKhoanNganHang`) và đối soát dòng tiền
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddBankOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Liên kết ngân hàng mới</span>
        </button>
      </div>

      {/* Tổng quan dòng tiền */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">
              Tổng cọc lịch xem đã nộp
            </span>
            <Wallet className="w-5 h-5 text-blue-200" />
          </Card.Header>
          <Card.Content className="p-0 mt-3">
            <div className="text-2xl font-black">{formatVND(escrowActiveTotal)}</div>
            <p className="text-[11px] text-blue-100 mt-1">
              Được bảo chứng 100% qua cơ chế hoàn cọc trực tiếp khi xem phòng
            </p>
          </Card.Content>
        </Card>

        <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tổng tiền cọc đã hoàn trả
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </Card.Header>
          <Card.Content className="p-0 mt-3">
            <div className="text-2xl font-black text-emerald-600">{formatVND(refundedTotal)}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Hoàn trả tự động khi hủy lịch hẹn hợp lệ trước giờ xem
            </p>
          </Card.Content>
        </Card>

        <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isChuTro ? 'Số dư Ví Chủ trọ (`ChuTro.soDu`)' : 'Tài khoản ngân hàng liên kết'}
            </span>
            <Building2 className="w-5 h-5 text-teal-600" />
          </Card.Header>
          <Card.Content className="p-0 mt-3">
            {isChuTro ? (
              <>
                <div className="text-2xl font-black text-slate-900">
                  {formatVND(landlordWallet?.soDu ?? 0)}
                </div>
                <Link
                  to="/landlord/wallet"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline mt-1"
                >
                  Tạo lệnh rút tiền về ngân hàng <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <div className="text-2xl font-black text-slate-900">{bankAccounts.length} thẻ</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sử dụng để nhận hoàn tiền hoặc nâng cấp vai trò Chủ trọ
                </p>
              </>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Danh sách tài khoản ngân hàng */}
      <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <Card.Header className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <Card.Title className="text-base font-bold text-slate-900">
              Tài khoản ngân hàng đã liên kết (`TaiKhoanNganHang`)
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Ràng buộc chuẩn: Số tài khoản 6–20 chữ số, tên ngân hàng chỉ chứa chữ cái và khoảng trắng
            </Card.Description>
          </div>
        </Card.Header>

        <Card.Content className="p-0 pt-4">
          {loadingBanks ? (
            <p className="text-xs text-slate-400 py-6 text-center">Đang tải danh sách ngân hàng...</p>
          ) : bankAccounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Chưa có tài khoản ngân hàng nào được liên kết.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id || acc.soTaiKhoan}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{acc.tenNganHang}</p>
                      <p className="text-xs font-mono text-slate-600">{acc.soTaiKhoan}</p>
                      {acc.tenChuTaiKhoan && (
                        <p className="text-[11px] text-slate-400 uppercase">{acc.tenChuTaiKhoan}</p>
                      )}
                    </div>
                  </div>
                  {acc.id && (
                    <button
                      type="button"
                      onClick={() => deleteBankMutation.mutate(acc.id!)}
                      title="Hủy liên kết"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Biến động gần đây */}
      <Card className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs">
        <Card.Header className="p-0 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <Card.Title className="text-base font-bold text-slate-900">
            Giao dịch gần đây
          </Card.Title>
          <Link to="/transactions" className="text-xs font-bold text-blue-600 hover:underline">
            Xem toàn bộ sổ cái →
          </Link>
        </Card.Header>
        <Card.Content className="p-0 divide-y divide-slate-100">
          {transactions.slice(0, 5).map((tx) => {
            const badge = getTransactionStatusBadge(tx.trangThai);
            return (
              <div key={tx.maGiaoDich} className="py-3.5 flex items-center justify-between text-xs">
                <div>
                  <Link
                    to={`/transactions/${tx.maGiaoDich}`}
                    className="font-bold text-slate-900 hover:text-blue-600"
                  >
                    #{tx.maGiaoDich} — {tx.noiDung}
                  </Link>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(tx.ngayGiaoDich)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-900">{formatVND(tx.soTien)}</div>
                  <span className={`text-[10px] font-semibold ${badge.textClass}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">Chưa phát sinh giao dịch.</p>
          )}
        </Card.Content>
      </Card>

      <Modal
        isOpen={isAddBankOpen}
        onClose={() => setIsAddBankOpen(false)}
        title="Liên kết tài khoản ngân hàng"
        subtitle="Sử dụng để nhận tiền hoàn cọc hoặc rút doanh thu phòng trọ"
      >
        <form onSubmit={handleAddBank} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Ngân hàng *</label>
            <select
              value={tenNganHang}
              onChange={(e) => setTenNganHang(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
            >
              {BANKS.map((b) => (
                <option key={b.code} value={b.shortName.replace(/[^A-Za-zÀ-ỹ\s]/g, '').trim()}>
                  {b.shortName} — {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Số tài khoản (6–20 chữ số) *
            </label>
            <input
              type="text"
              value={soTaiKhoan}
              onChange={(e) => setSoTaiKhoan(e.target.value.replace(/\D/g, ''))}
              maxLength={20}
              placeholder="VD: 1029384756"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Họ tên chủ tài khoản (Tùy chọn)
            </label>
            <input
              type="text"
              value={tenChuTaiKhoan}
              onChange={(e) => setTenChuTaiKhoan(e.target.value)}
              placeholder="VD: NGUYEN VAN A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs uppercase text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddBankOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={addBankMutation.isPending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {addBankMutation.isPending ? 'Đang lưu...' : 'Lưu liên kết'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WalletPage;
