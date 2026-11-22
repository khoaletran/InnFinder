import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  Search,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import {
  AdminErrorState,
  AdminRefreshButton,
  AdminTableSkeleton,
} from '@/components/common/AdminStates';
import {
  formatVND,
  formatDateTime,
  formatTransactionType,
  getTransactionStatusBadge,
} from '@/utils/formatters';
import type { AdminTransactionItem } from '@/types/admin.types';
import type { TrangThaiGD } from '@/types/transaction.types';

export const TransactionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WITHDRAWAL' | 'DEPOSIT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TrangThaiGD>('CHO_THANH_TOAN');
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);

  // Từ chối rút tiền
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const {
    data: transactions = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'transactions', submittedKeyword],
    queryFn: () => adminService.getTransactions(submittedKeyword || undefined),
  });

  const {
    data: treasury,
    isLoading: isTreasuryLoading,
    isFetching: isTreasuryFetching,
    refetch: refetchTreasury,
  } = useQuery({
    queryKey: ['admin', 'treasury-stats'],
    queryFn: () => adminService.getTreasuryStats(),
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: (id: string) => adminService.approveWithdrawal(id),
    onSuccess: () => {
      toast.success('Đã phê duyệt lệnh rút tiền thành công!');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi duyệt rút tiền');
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.rejectWithdrawal(id, reason),
    onSuccess: () => {
      toast.success('Đã từ chối lệnh rút tiền và hoàn số dư về ví Chủ trọ!');
      setRejectingTxId(null);
      setRejectReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi từ chối rút tiền');
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

  const typeFiltered = useMemo(
    () =>
      transactions.filter((tx) => {
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
        return true;
      }),
    [transactions, filterType],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<TrangThaiGD, number> = {
      CHO_THANH_TOAN: 0,
      THANH_CONG: 0,
      HOAN_TIEN: 0,
      THAT_BAI: 0,
    };
    for (const tx of typeFiltered) {
      if (tx.trangThai && tx.trangThai in counts) {
        counts[tx.trangThai]++;
      }
    }
    return counts;
  }, [typeFiltered]);

  const filtered = typeFiltered.filter((tx) => tx.trangThai === statusFilter);

  const tongDoanhThu = treasury?.tongDoanhThu ?? 0;
  const quyTamGiuCoc = treasury?.quyTamGiuCoc ?? 0;
  const tongSoDuViChuTro = treasury?.tongSoDuViChuTro ?? 0;
  const quyChoRut = treasury?.quyChoRut ?? 0;
  const soLenhRutChoDuyet = treasury?.soLenhRutChoDuyet ?? 0;

  return (
    <div className="space-y-6">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Sổ cái Giao dịch & Ngân khố
        </h1>

        <AdminRefreshButton
          onClick={() => {
            void refetch();
            void refetchTreasury();
          }}
          isRefreshing={isFetching || isTreasuryFetching}
          label="Làm mới sổ cái"
        />
      </div>

      {/* Company Treasury Summary */}
      <Card className="bg-slate-900 rounded-2xl p-5 lg:p-6 text-white shadow-md border border-slate-800">
        <Card.Header className="p-0 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              Ngân khố công ty
            </div>
            <Card.Title className="text-base sm:text-lg font-bold text-slate-100 mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>Tổng tiền thực tế trong ngân khố:</span>
              {isTreasuryLoading ? (
                <span className="inline-block h-7 w-40 rounded-lg bg-white/15 animate-pulse align-middle" />
              ) : (
                <span className="text-2xl font-black text-white tabular-nums">
                  {formatVND(treasury?.tongQuyThucTe ?? 0)}
                </span>
              )}
            </Card.Title>
            <p className="text-xs text-slate-300 mt-1 tabular-nums">
              {isTreasuryLoading ? (
                <span className="inline-block h-4 w-72 rounded bg-white/10 animate-pulse" />
              ) : (
                <>
                  Tiền của công ty ({formatVND(tongDoanhThu)}) + Quỹ đang giữ hộ (
                  {formatVND(treasury?.tongQuyHeThong ?? 0)})
                </>
              )}
            </p>
          </div>
        </Card.Header>

        <Card.Content className="p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
            <span className="text-[11px] font-semibold text-emerald-200 block mb-1">
              Tiền của công ty (Hoa hồng sàn)
            </span>
            {isTreasuryLoading ? (
              <div className="h-6 w-28 rounded bg-white/15 animate-pulse my-1" />
            ) : (
              <div className="text-lg font-extrabold text-emerald-300 tabular-nums">
                {formatVND(tongDoanhThu)}
              </div>
            )}
            <p className="text-[11px] text-slate-300 mt-1">
              Doanh thu thực từ phí hoa hồng lịch hẹn hoàn tất
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-slate-300 block mb-1">
              Cọc giữ chân tạm giữ
            </span>
            {isTreasuryLoading ? (
              <div className="h-6 w-28 rounded bg-white/10 animate-pulse my-1" />
            ) : (
              <div
                className={`text-lg font-bold tabular-nums ${
                  quyTamGiuCoc > 0 ? 'text-amber-300' : 'text-slate-400'
                }`}
              >
                {formatVND(quyTamGiuCoc)}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Tiền cọc lịch hẹn đang chờ xem phòng
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-semibold text-slate-300 block mb-1">
              Tổng số dư ví Chủ trọ
            </span>
            {isTreasuryLoading ? (
              <div className="h-6 w-28 rounded bg-white/10 animate-pulse my-1" />
            ) : (
              <div
                className={`text-lg font-bold tabular-nums ${
                  tongSoDuViChuTro > 0 ? 'text-teal-300' : 'text-slate-400'
                }`}
              >
                {formatVND(tongSoDuViChuTro)}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Khả dụng cho chủ trọ rút về ngân hàng
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFilterType('WITHDRAWAL');
              setStatusFilter('CHO_THANH_TOAN');
            }}
            className="text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-slate-300">
                  Tiền chờ chi trả rút
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
              {isTreasuryLoading ? (
                <div className="h-6 w-28 rounded bg-white/10 animate-pulse my-1" />
              ) : (
                <div
                  className={`text-lg font-bold tabular-nums ${
                    quyChoRut > 0 ? 'text-sky-300' : 'text-slate-400'
                  }`}
                >
                  {formatVND(quyChoRut)}
                </div>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-sky-200 tabular-nums">
                {soLenhRutChoDuyet} lệnh chờ duyệt
              </span>
            </div>
          </button>
        </Card.Content>
      </Card>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap rounded-xl bg-slate-200/70 p-1 gap-1 text-xs font-semibold">
          {[
            { key: 'ALL' as const, label: 'Tất cả biến động sổ cái' },
            { key: 'WITHDRAWAL' as const, label: 'Lệnh rút tiền về ngân hàng' },
            { key: 'DEPOSIT' as const, label: 'Giao dịch cọc giữ chân' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === tab.key
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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
            placeholder="Tìm mã giao dịch, người thực hiện..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500"
          />
        </form>
      </div>

      {/* Status Tab Bar */}
      <StatusTabBar
        ariaLabel="Lọc giao dịch theo trạng thái"
        activeKey={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          {
            key: 'CHO_THANH_TOAN',
            label: 'Chờ thanh toán',
            count: statusCounts.CHO_THANH_TOAN,
            icon: Clock,
          },
          {
            key: 'THANH_CONG',
            label: 'Thành công',
            count: statusCounts.THANH_CONG,
            icon: CheckCircle2,
          },
          {
            key: 'HOAN_TIEN',
            label: 'Hoàn tiền',
            count: statusCounts.HOAN_TIEN,
            icon: RotateCcw,
          },
          {
            key: 'THAT_BAI',
            label: 'Thất bại',
            count: statusCounts.THAT_BAI,
            icon: XCircle,
          },
        ]}
      />

      {/* Transactions Table */}
      {isError ? (
        <AdminErrorState
          title="Không thể tải dữ liệu sổ cái giao dịch"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
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
                  <AdminTableSkeleton rows={6} cols={8} />
                ) : filtered.length > 0 ? (
                  filtered.map((tx) => {
                    const isWithdrawal =
                      tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' || tx.loaiGiaoDich === 'RUT_TIEN';
                    const isPending = tx.trangThai === 'CHO_THANH_TOAN';
                    const txMeta = formatTransactionType(tx.loaiGiaoDich);
                    return (
                      <tr key={tx.maGiaoDich} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {tx.maGiaoDich}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{txMeta.label}</span>
                          {tx.phongTro && (
                            <span className="text-[11px] text-slate-500 block max-w-xs truncate">
                              {tx.phongTro}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-black text-sm ${
                              tx.soTien === 0
                                ? 'text-slate-400'
                                : isWithdrawal
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
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isWithdrawal && isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={approveWithdrawalMutation.isPending}
                                  onClick={() => approveWithdrawalMutation.mutate(tx.maGiaoDich)}
                                  title="Phê duyệt chuyển tiền"
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
                                  title="Từ chối rút tiền"
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
                      Không có giao dịch nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card.Content>
        </Card>
      )}

      {/* MODAL CHI TIẾT GIAO DỊCH */}
      <Modal
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? formatTransactionType(selectedTx.loaiGiaoDich).label : 'Chi tiết giao dịch'}
        subtitle={selectedTx ? `Mã giao dịch: ${selectedTx.maGiaoDich}` : undefined}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => setSelectedTx(null)}
            className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
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

      {/* MODAL TỪ CHỐI RÚT TIỀN */}
      <Modal
        isOpen={!!rejectingTxId}
        onClose={() => setRejectingTxId(null)}
        title="Từ chối lệnh rút tiền"
        subtitle="Số tiền yêu cầu sẽ được hoàn lại 100% vào ví của Chủ trọ."
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
