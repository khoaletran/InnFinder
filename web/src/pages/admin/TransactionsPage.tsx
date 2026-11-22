import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { CheckCircle2, XCircle, Eye, Search, Info } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import {
  formatVND,
  formatDateTime,
  formatTransactionType,
  getTransactionStatusBadge,
} from '@/utils/formatters';
import type { AdminTransactionItem } from '@/types/admin.types';
import type { TrangThaiGD } from '@/types/transaction.types';

const STATUS_FILTERS: Array<{ key: 'ALL' | TrangThaiGD; label: string }> = [
  { key: 'ALL', label: 'Tất cả trạng thái' },
  { key: 'CHO_THANH_TOAN', label: 'Chờ thanh toán' },
  { key: 'THANH_CONG', label: 'Thành công' },
  { key: 'HOAN_TIEN', label: 'Hoàn tiền' },
  { key: 'THAT_BAI', label: 'Thất bại' },
];

export const TransactionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WITHDRAWAL' | 'DEPOSIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TrangThaiGD>('ALL');
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);

  // Từ chối rút tiền
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin', 'transactions', submittedKeyword],
    queryFn: () => adminService.getTransactions(submittedKeyword || undefined),
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: (id: string) => adminService.approveWithdrawal(id),
    onSuccess: () => {
      toast.success('Đã phê duyệt giao dịch thành công!');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi duyệt giao dịch');
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối giao dịch thành công!');
      setRejectingTxId(null);
      setRejectReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi từ chối giao dịch');
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedKeyword(searchInput.trim());
  };

  const handleConfirmRejectWithdrawal = () => {
    if (!rejectingTxId) return;
    rejectWithdrawalMutation.mutate({
      id: rejectingTxId,
      reason: rejectReason.trim() || undefined,
    });
  };

  const renderStatusBadge = (status: TrangThaiGD) => {
    const badge = getTransactionStatusBadge(status);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
        {badge.label}
      </span>
    );
  };

  const filtered = transactions.filter((tx) => {
    if (
      filterType === 'WITHDRAWAL' &&
      tx.loaiGiaoDich !== 'YEU_CAU_RUT_TIEN' &&
      tx.loaiGiaoDich !== 'RUT_TIEN'
    ) {
      return false;
    }
    if (filterType === 'DEPOSIT' && !tx.loaiGiaoDich.includes('COC')) {
      return false;
    }
    if (statusFilter !== 'ALL' && tx.trangThai !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Sổ cái Giao dịch & Ngân khố
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ghi nhận biến động dòng tiền (`CHO_THANH_TOAN`, `THANH_CONG`, `THAT_BAI`, `HOAN_TIEN`) và phê duyệt lệnh rút ngân hàng
        </p>
      </div>

      {/* Ledger Notice */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p>
          <strong>Lưu ý nghiệp vụ:</strong> Bảng <code className="font-mono">GiaoDich</code> chỉ là sổ cái đối soát dòng tiền luân chuyển (tạm giữ cọc, hoàn cọc, rút tiền). Doanh thu sàn được thống kê độc lập từ <code className="font-mono">SUM(phiThu)</code> của các phiếu hẹn <code className="font-mono">HOAN_THANH</code>.
        </p>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'ALL' as const, label: 'Tất cả biến động sổ cái' },
            { key: 'WITHDRAWAL' as const, label: 'Lệnh rút tiền về ngân hàng' },
            { key: 'DEPOSIT' as const, label: 'Giao dịch cọc giữ chân' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === tab.key
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã GD, người thực hiện..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </form>
      </div>

      {/* 4 Standard TrangThaiGD Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setStatusFilter(st.key)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              statusFilter === st.key
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <Card className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-0">
        <Card.Content className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã giao dịch</th>
                <th className="py-3 px-4">Loại giao dịch</th>
                <th className="py-3 px-4">Số tiền</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Ngân hàng thụ hưởng</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <div className="mt-2">Đang tải dữ liệu sổ cái giao dịch...</div>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((tx) => {
                  const isWithdrawal =
                    tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' || tx.loaiGiaoDich === 'RUT_TIEN';
                  const isRefund = tx.loaiGiaoDich === 'HOAN_COC';
                  const isPending = tx.trangThai === 'CHO_THANH_TOAN';
                  const isActionable = (isWithdrawal || isRefund) && isPending;
                  const txMeta = formatTransactionType(tx.loaiGiaoDich);
                  return (
                    <tr key={tx.maGiaoDich} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {tx.maGiaoDich}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{txMeta.label}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tx.loaiGiaoDich}
                          {tx.phongTro ? ` • ${tx.phongTro}` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-sm ${
                            isWithdrawal
                              ? 'text-rose-600'
                              : tx.trangThai === 'HOAN_TIEN'
                                ? 'text-sky-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {isWithdrawal ? '-' : '+'}
                          {formatVND(tx.soTien)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {tx.nguoiThucHien}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.tenNganHang ? (
                          <div>
                            <span className="font-bold">{tx.tenNganHang}</span>
                            <span className="block text-[10px] font-mono text-slate-400">
                              {tx.soTaiKhoan}
                            </span>
                          </div>
                        ) : (
                          txMeta.method
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDateTime(tx.thoiGian)}
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(tx.trangThai)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            title="Xem chi tiết giao dịch"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isActionable && (
                            <>
                              <button
                                type="button"
                                disabled={approveWithdrawalMutation.isPending}
                                onClick={() => approveWithdrawalMutation.mutate(tx.maGiaoDich)}
                                title="Phê duyệt giao dịch"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingTxId(tx.maGiaoDich);
                                  setRejectReason('');
                                }}
                                title="Từ chối giao dịch"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không có giao dịch nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card.Content>
      </Card>

      {/* MODAL CHI TIẾT GIAO DỊCH */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? formatTransactionType(selectedTx.loaiGiaoDich).label : 'Chi tiết giao dịch'}
        subtitle={selectedTx ? `Mã giao dịch: ${selectedTx.maGiaoDich}` : undefined}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Đóng
            </button>
            {selectedTx && selectedTx.trangThai === 'CHO_THANH_TOAN' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const txId = selectedTx.maGiaoDich;
                    setSelectedTx(null);
                    setRejectingTxId(txId);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  disabled={approveWithdrawalMutation.isPending}
                  onClick={() => {
                    const txId = selectedTx.maGiaoDich;
                    setSelectedTx(null);
                    approveWithdrawalMutation.mutate(txId);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {approveWithdrawalMutation.isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Xác nhận đã chuyển tiền</span>
                </button>
              </div>
            )}
          </div>
        }
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <span className="text-xs text-slate-500 block mb-1">Số tiền giao dịch</span>
              <div className="text-2xl font-black text-slate-900 mb-2">
                {formatVND(selectedTx.soTien)}
              </div>
              {renderStatusBadge(selectedTx.trangThai)}
            </div>

            {/* Khối VietQR 1-chạm nếu là lệnh hoàn cọc hoặc rút tiền đang chờ xử lý */}
            {selectedTx.trangThai === 'CHO_THANH_TOAN' &&
              selectedTx.soTaiKhoan && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2 rounded-xl shadow-xs shrink-0 text-center">
                    <img
                      src={`https://vietqr.app/img?bank=${encodeURIComponent(
                        selectedTx.tenNganHang || 'MBBank',
                      )}&acc=${encodeURIComponent(
                        selectedTx.soTaiKhoan,
                      )}&template=compact&amount=${selectedTx.soTien}&des=${encodeURIComponent(
                        (selectedTx.loaiGiaoDich === 'HOAN_COC' ? 'HOAN COC ' : 'RUT TIEN ') +
                          selectedTx.maGiaoDich,
                      )}&holder=${encodeURIComponent(
                        selectedTx.tenChuTaiKhoan || selectedTx.nguoiThucHien,
                      )}`}
                      alt="Mã VietQR chuyển khoản"
                      className="w-32 h-32 object-contain mx-auto"
                    />
                    <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                      Quét bằng App Ngân hàng
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-700 w-full">
                    <div className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
                      <span>Mã VietQR 1-Chạm</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        Tự động điền
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        Ngân hàng: <strong>{selectedTx.tenNganHang || 'MBBank'}</strong>
                      </div>
                      <div>
                        Số tài khoản: <strong className="font-mono">{selectedTx.soTaiKhoan}</strong>
                      </div>
                      <div>
                        Chủ tài khoản:{' '}
                        <strong>
                          {selectedTx.tenChuTaiKhoan || selectedTx.nguoiThucHien}
                        </strong>
                      </div>
                      <div>
                        Số tiền:{' '}
                        <strong className="text-emerald-700 font-bold">
                          {formatVND(selectedTx.soTien)}
                        </strong>
                      </div>
                      <div>
                        Nội dung CK:{' '}
                        <strong className="font-mono text-slate-800">
                          {(selectedTx.loaiGiaoDich === 'HOAN_COC' ? 'HOAN COC ' : 'RUT TIEN ') +
                            selectedTx.maGiaoDich}
                        </strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Admin mở App ngân hàng quét mã QR trên để chuyển tiền, sau đó bấm &quot;Xác nhận đã chuyển tiền&quot;.
                    </p>
                  </div>
                </div>
              )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Người thực hiện</span>
                <span className="font-bold text-slate-800">{selectedTx.nguoiThucHien}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian tạo</span>
                <span className="text-slate-800">{formatDateTime(selectedTx.thoiGian)}</span>
              </div>
              {selectedTx.tenNganHang && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Ngân hàng nhận</span>
                  <span className="font-bold text-slate-800">
                    {selectedTx.tenNganHang} ({selectedTx.soTaiKhoan})
                    {selectedTx.tenChuTaiKhoan ? ` - ${selectedTx.tenChuTaiKhoan}` : ''}
                  </span>
                </div>
              )}
              {selectedTx.ghiChu && (
                <div className="py-2 px-3 text-slate-600 bg-slate-50 rounded-xl">
                  Ghi chú: {selectedTx.ghiChu}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TỪ CHỐI GIAO DỊCH */}
      <Modal
        isOpen={!!rejectingTxId}
        onClose={() => setRejectingTxId(null)}
        title="Từ chối giao dịch"
        subtitle="Vui lòng nhập lý do từ chối để hệ thống gửi thông báo cho người dùng."
        maxWidth="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectingTxId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectWithdrawalMutation.isPending}
              onClick={handleConfirmRejectWithdrawal}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              {rejectWithdrawalMutation.isPending && <Spinner size="sm" color="current" />}
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <textarea
          rows={3}
          placeholder="Nhập lý do từ chối (VD: Tên chủ tài khoản không khớp CCCD...)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
        />
      </Modal>
    </div>
  );
};
