import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import {
  Copy,
  Info,
  Eye,
  ExternalLink,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Search,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { VIETNAM_BANKS } from '@/constants/banks';
import { RowActions, StatusBadge, TableCell } from '@/components/common/TableParts';
import { StatusTabBar } from '@/components/common/StatusTabBar';
import { MoneyText } from '@/components/common/MoneyText';
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

function getBankId(bankName?: string): string {
  if (!bankName) return '970422';
  const clean = bankName.trim().toLowerCase();
  const found = VIETNAM_BANKS.find(
    (b) =>
      b.shortName.toLowerCase() === clean ||
      b.code.toLowerCase() === clean ||
      b.bin === clean ||
      b.name.toLowerCase().includes(clean) ||
      clean.includes(b.shortName.toLowerCase()) ||
      clean.includes(b.code.toLowerCase()),
  );
  return found ? found.bin : '970422';
}

function buildVietQrImageUrl(
  bankName: string | undefined,
  accountNo: string,
  amount: number,
  description: string,
  accountName: string,
  template = 'compact2',
): string {
  const bankId = getBankId(bankName);
  const cleanAcc = encodeURIComponent(accountNo.replace(/\s+/g, ''));
  const cleanAmount = Math.max(0, Math.round(amount));
  const cleanDesc = encodeURIComponent(description.trim());
  const cleanHolder = encodeURIComponent(accountName.trim().toUpperCase());

  return `https://img.vietqr.io/image/${bankId}-${cleanAcc}-${template}.svg?amount=${cleanAmount}&addInfo=${cleanDesc}&accountName=${cleanHolder}`;
}

export const TransactionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type');
  const filterType = type === 'withdrawal' ? 'WITHDRAWAL' : type === 'deposit' ? 'DEPOSIT' : 'ALL';
  const setFilterType = (filter: 'ALL' | 'WITHDRAWAL' | 'DEPOSIT') => {
    setSearchParams((params) => {
      if (filter === 'ALL') params.delete('type');
      else params.set('type', filter.toLowerCase());
      return params;
    }, { replace: true });
  };
  const [statusFilter, setStatusFilter] = useState<TrangThaiGD>('CHO_THANH_TOAN');
  const [selectedTx, setSelectedTx] = useState<AdminTransactionItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modal xác nhận chuyển tiền 2 bước có chứng từ (Proof of Transfer)
  const [approvingTx, setApprovingTx] = useState<AdminTransactionItem | null>(null);
  const [bankRefCode, setBankRefCode] = useState('');
  const [isConfirmedTransfer, setIsConfirmedTransfer] = useState(false);

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Đã sao chép ${field}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Từ chối rút tiền / hoàn cọc
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
    mutationFn: ({ id, refCode }: { id: string; refCode?: string }) =>
      adminService.approveWithdrawal(id, refCode),
    onSuccess: () => {
      toast.success('Đã phê duyệt và cập nhật sổ cái thành công!');
      setApprovingTx(null);
      setBankRefCode('');
      setIsConfirmedTransfer(false);
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
    const colors: Record<TrangThaiGD, { bg: string; text: string; dot: string }> = {
      CHO_THANH_TOAN: { bg: 'bg-tone-amber-soft', text: 'text-tone-amber-strong', dot: 'bg-tone-amber-dot' },
      THANH_CONG: { bg: 'bg-tone-green-soft', text: 'text-tone-green-strong', dot: 'bg-tone-green-dot' },
      HOAN_TIEN: { bg: 'bg-tone-blue-soft', text: 'text-tone-blue-strong', dot: 'bg-tone-blue-dot' },
      THAT_BAI: { bg: 'bg-tone-red-soft', text: 'text-tone-red-strong', dot: 'bg-tone-red-dot' },
    };
    const tone = colors[status] ?? colors.THAT_BAI;
    return <StatusBadge className={tone.bg + ' ' + tone.text} dotClass={tone.dot}>{badge.label}</StatusBadge>;
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
    <div className="mx-auto max-w-[1280px] space-y-7">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-text tracking-[-0.01em]">
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

      <Card className="rounded-xl border border-border border-t-[3px] border-t-tone-teal-base bg-surface p-4 sm:p-5">
        <Card.Header className="p-0">
          <Card.Title className="flex items-center gap-2 text-[13px] font-semibold text-text-muted">
            <Wallet aria-hidden="true" className="size-4 text-accent" />
            Tổng tiền thực tế trong ngân khố
          </Card.Title>
          {isTreasuryLoading ? (
            <span className="mt-1 h-10 w-40 animate-pulse rounded bg-surface-muted" />
          ) : (
            <MoneyText amount={treasury?.tongQuyThucTe} className="mt-1 block text-[40px] font-bold leading-none text-text" unitClassName="ml-1 text-base text-text-muted" />
          )}
          <p className="mt-1 text-[13px] text-text-muted">
            Tiền của công ty + quỹ đang giữ hộ{treasury && (' (' + formatVND(treasury.tongQuyHeThong) + ')')}
          </p>
        </Card.Header>
        <Card.Content className="mt-3 p-0">
          <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 lg:grid-cols-4">
            {[
              { label: 'Tiền của công ty', amount: tongDoanhThu, color: 'text-accent', help: 'Doanh thu từ phí hoa hồng lịch hẹn hoàn tất' },
              { label: 'Cọc tạm giữ', amount: quyTamGiuCoc, color: 'text-text', help: 'Tiền cọc lịch hẹn đang chờ xem phòng' },
              { label: 'Số dư ví chủ trọ', amount: tongSoDuViChuTro, color: 'text-text', help: 'Số dư khả dụng để rút về ngân hàng' },
              { label: 'Tiền chờ chi trả', amount: quyChoRut, color: quyChoRut > 0 ? 'text-tone-amber-strong' : 'text-text-muted', help: 'Khoản rút tiền đang chờ duyệt', withdrawal: true },
            ].map(({ label, amount, color, help, withdrawal }) => (
              <div key={label} className="min-w-0">
                <dt className="flex items-center gap-1 text-[13px] text-text-muted">
                  {label}
                  <span title={help} aria-label={help} role="img" tabIndex={0} className="shrink-0"><Info aria-hidden="true" className="size-3.5" /></span>
                </dt>
                <dd className="mt-1">
                  {isTreasuryLoading ? <div className="h-7 w-24 animate-pulse rounded bg-surface-muted" /> :
                    <MoneyText amount={amount} className={'text-2xl font-semibold leading-none ' + color} />}
                </dd>
                {withdrawal && soLenhRutChoDuyet > 0 && (
                  <dd><button type="button" className="mt-1 text-left text-[13px] font-semibold text-tone-amber-strong hover:underline"
                    onClick={() => { setFilterType('WITHDRAWAL'); setStatusFilter('CHO_THANH_TOAN'); }}>
                    {soLenhRutChoDuyet} lệnh chờ duyệt →
                  </button></dd>
                )}
              </div>
            ))}
          </dl>
        </Card.Content>
      </Card>

      <section className="space-y-3" aria-label="Bộ lọc và danh sách giao dịch">
      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap rounded-lg bg-surface-muted p-1 gap-1 text-xs">
          {[
            { key: 'ALL' as const, label: 'Tất cả biến động sổ cái' },
            { key: 'WITHDRAWAL' as const, label: 'Lệnh rút tiền về ngân hàng' },
            { key: 'DEPOSIT' as const, label: 'Giao dịch cọc giữ chân' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                filterType === tab.key
                  ? 'bg-surface text-tone-teal-strong font-semibold shadow-[var(--shadow-tab-active)]'
                  : 'text-text-muted hover:text-text font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Tìm giao dịch"
            placeholder="Tìm mã giao dịch, người thực hiện..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-surface border border-border text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-accent"
          />
        </form>
      </div>

      <StatusTabBar
        ariaLabel="Lọc giao dịch theo trạng thái"
        activeKey={statusFilter}
        onChange={setStatusFilter}
        tabs={[
          { key: 'CHO_THANH_TOAN', label: 'Chờ thanh toán', count: statusCounts.CHO_THANH_TOAN, icon: Clock },
          { key: 'THANH_CONG', label: 'Thành công', count: statusCounts.THANH_CONG, icon: CheckCircle2 },
          { key: 'HOAN_TIEN', label: 'Hoàn tiền', count: statusCounts.HOAN_TIEN, icon: RotateCcw },
          { key: 'THAT_BAI', label: 'Thất bại', count: statusCounts.THAT_BAI, icon: XCircle },
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
        <div className="ledger-results rounded-xl border border-border bg-surface">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
            <h2 id="ledger-results-title" className="text-sm font-semibold text-text">Danh sách giao dịch</h2>
            <span aria-live="polite" className="text-[13px] text-text-muted">
              {isLoading ? 'Đang tải…' : filtered.length.toLocaleString('vi-VN') + ' giao dịch'}
            </span>
          </header>
          <table className="ledger-table text-left" aria-labelledby="ledger-results-title" role="table">
            <colgroup>
              {[10, 20, 13, 14, 12, 9, 13, 9].map((width, index) => <col key={index} style={{ width: width + '%' }} />)}
            </colgroup>
            <thead>
              <tr>
                {['Mã GD', 'Loại giao dịch', 'Số tiền', 'Người thực hiện', 'Ngân hàng', 'Thời gian', 'Trạng thái', ''].map((label, index) => (
                  <th key={label} scope="col" className={'py-3 ' + (index === 2 ? 'text-right' : '')}>
                    {label || <span className="sr-only">Thao tác</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {isLoading ? <AdminTableSkeleton rows={6} cols={8} /> : filtered.length ? filtered.map((tx) => {
                const isWithdrawal = tx.loaiGiaoDich === 'YEU_CAU_RUT_TIEN' || tx.loaiGiaoDich === 'RUT_TIEN';
                const isIncoming = tx.loaiGiaoDich === 'COC_XEM_PHONG' || tx.loaiGiaoDich === 'THU_HOA_HONG';
                const refund = tx.loaiGiaoDich === 'HOAN_COC';
                const statusAllowsProcessing = (isWithdrawal || refund) && tx.trangThai === 'CHO_THANH_TOAN';
                const [time, date] = formatDateTime(tx.thoiGian).replace(',', '').split(' ');
                const account = tx.soTaiKhoan?.trim();
                const ghost = 'grid size-8 shrink-0 place-items-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text';
                return (
                  <tr key={tx.maGiaoDich} role="row" className="group hover:bg-surface-subtle">
                    <TableCell label="Mã GD">
                      <div className="flex items-center gap-1">
                        <code className="truncate text-[13px] text-text-muted" title={tx.maGiaoDich}>{tx.maGiaoDich}</code>
                        <button type="button" aria-label={'Sao chép mã ' + tx.maGiaoDich}
                          className="grid size-6 shrink-0 place-items-center rounded text-text-muted hover:bg-surface-muted focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          onClick={() => {
                            if (!navigator.clipboard) { toast.error('Không thể sao chép mã giao dịch'); return; }
                            void navigator.clipboard.writeText(tx.maGiaoDich).then(
                              () => toast.success('Đã sao chép mã giao dịch'),
                              () => toast.error('Không thể sao chép mã giao dịch'),
                            );
                          }}>
                          <Copy aria-hidden="true" className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell label="Loại giao dịch">
                      <span className="block truncate font-medium text-text" title={formatTransactionType(tx.loaiGiaoDich).label}>{formatTransactionType(tx.loaiGiaoDich).label}</span>
                      {tx.phongTro && <span className="block truncate text-xs text-text-muted" title={tx.phongTro}>{tx.phongTro}</span>}
                    </TableCell>
                    <TableCell label="Số tiền" className="text-right">
                      <MoneyText amount={Math.abs(tx.soTien)} prefix={tx.soTien ? isWithdrawal ? '−' : isIncoming ? '+' : tx.soTien < 0 ? '−' : '' : ''}
                        className={'font-semibold ' + (isIncoming && tx.soTien > 0 ? 'text-tone-green-base' : 'text-text')} />
                    </TableCell>
                    <TableCell label="Người thực hiện"><span className="block truncate text-[13px] text-text-muted" title={tx.nguoiThucHien}>{tx.nguoiThucHien}</span></TableCell>
                    <TableCell label="Ngân hàng">
                      {tx.tenNganHang ? (
                        <>
                          <span className="block truncate text-[13px] text-text-muted" title={tx.tenNganHang}>{tx.tenNganHang}</span>
                          {account && <span className="block whitespace-nowrap font-mono text-xs text-text-muted">{'••••' + (account.length > 4 ? account.slice(-4) : '')}</span>}
                        </>
                      ) : <span className="text-text-subtle" aria-label="Không có ngân hàng">—</span>}
                    </TableCell>
                    <TableCell label="Thời gian">
                      <span className="block whitespace-nowrap text-[13px] tabular-nums text-text-muted">{time}</span>
                      {date && <span className="block whitespace-nowrap text-xs tabular-nums text-text-muted">{date}</span>}
                    </TableCell>
                    <TableCell label="Trạng thái">{renderStatusBadge(tx.trangThai)}</TableCell>
                    <TableCell label="Thao tác">
                      <RowActions actions={statusAllowsProcessing ? [
                        { label: 'Duyệt', run: () => setSelectedTx(tx), disabled: refund && !account },
                        { label: 'Từ chối', danger: true, run: () => { setRejectingTxId(tx.maGiaoDich); setRejectReason(''); } },
                      ] : undefined}>
                        <button type="button" onClick={() => setSelectedTx(tx)} aria-label={'Xem giao dịch ' + tx.maGiaoDich} className={ghost}>
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                      </RowActions>
                    </TableCell>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="text-center text-[13px] text-text-muted">Không có giao dịch nào phù hợp với bộ lọc hiện tại.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </section>

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
                  disabled={selectedTx.loaiGiaoDich === 'HOAN_COC' && !selectedTx.soTaiKhoan}
                  title={
                    selectedTx.loaiGiaoDich === 'HOAN_COC' && !selectedTx.soTaiKhoan
                      ? 'Khách hàng chưa cập nhật tài khoản ngân hàng nhận tiền'
                      : undefined
                  }
                  onClick={() => {
                    const tx = selectedTx;
                    setSelectedTx(null);
                    setApprovingTx(tx);
                    setBankRefCode('');
                    setIsConfirmedTransfer(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận đã chuyển tiền</span>
                </button>
              </div>
            )}
          </div>
        }
      >
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-subtle border border-border rounded-xl text-center">
              <span className="text-xs text-text-muted block mb-1">Số tiền giao dịch</span>
              <div className="text-2xl font-semibold text-text tabular-nums mb-2">
                {formatVND(selectedTx.soTien)}
              </div>
              {renderStatusBadge(selectedTx.trangThai)}
            </div>

            {/* Cảnh báo nếu là lệnh hoàn cọc nhưng khách chưa liên kết STK ngân hàng */}
            {selectedTx.trangThai === 'CHO_THANH_TOAN' &&
              selectedTx.loaiGiaoDich === 'HOAN_COC' &&
              !selectedTx.soTaiKhoan && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold text-amber-950">
                    Khách hàng chưa liên kết tài khoản ngân hàng nhận tiền
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Chưa thể tạo mã VietQR và chưa thể xác nhận hoàn tất chuyển khoản. Vui lòng chờ khách hàng bổ sung số tài khoản, hoặc bấm Từ chối kèm lý do để thông báo khách cập nhật STK.
                  </p>
                </div>
              )}

            {/* Khối VietQR chuẩn API img.vietqr.io nếu là lệnh hoàn cọc hoặc rút tiền đang chờ xử lý */}
            {selectedTx.trangThai === 'CHO_THANH_TOAN' && selectedTx.soTaiKhoan && (() => {
              const description =
                (selectedTx.loaiGiaoDich === 'HOAN_COC' ? 'HOAN COC ' : 'RUT TIEN ') +
                selectedTx.maGiaoDich;
              const accountHolder = selectedTx.tenChuTaiKhoan || selectedTx.nguoiThucHien;
              const qrUrl = buildVietQrImageUrl(
                selectedTx.tenNganHang,
                selectedTx.soTaiKhoan,
                selectedTx.soTien,
                description,
                accountHolder,
                'compact2',
              );

              return (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col md:flex-row items-center gap-4">
                  <div className="bg-white p-2.5 rounded-2xl shadow-xs shrink-0 text-center border border-emerald-100">
                    <img
                      src={qrUrl}
                      alt="Mã VietQR chuyển khoản"
                      className="w-36 h-36 object-contain mx-auto rounded-lg"
                    />
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(qrUrl, 'Link VietQR')}
                        className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                        title="Sao chép link VietQR"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Sao chép link</span>
                      </button>
                      <a
                        href={qrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 p-0.5 rounded-md cursor-pointer"
                        title="Mở ảnh gốc trong tab mới"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700 w-full">
                    <div className="font-bold text-emerald-800 text-sm">
                      Mã VietQR chuyển khoản
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-1 bg-white/80 p-2.5 rounded-xl border border-emerald-100/60">
                      <div className="flex items-center justify-between">
                        <span>Ngân hàng: <strong>{selectedTx.tenNganHang || 'Ngân hàng'}</strong></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Số tài khoản: <strong className="font-mono text-slate-900">{selectedTx.soTaiKhoan}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTx.soTaiKhoan!, 'Số tài khoản')}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                        >
                          {copiedField === 'Số tài khoản' ? 'Đã chép' : 'Chép STK'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Chủ tài khoản: <strong>{accountHolder}</strong></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Số tiền: <strong className="text-emerald-700 font-bold">{formatVND(selectedTx.soTien)}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedTx.soTien.toString(), 'Số tiền')}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                        >
                          {copiedField === 'Số tiền' ? 'Đã chép' : 'Chép tiền'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Nội dung CK: <strong className="font-mono text-slate-900">{description}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopy(description, 'Nội dung chuyển khoản')}
                          className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
                        >
                          {copiedField === 'Nội dung chuyển khoản' ? 'Đã chép' : 'Chép nội dung'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/70">
                <span className="text-text-muted">Người thực hiện</span>
                <span className="font-medium text-text">{selectedTx.nguoiThucHien}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/70">
                <span className="text-text-muted">Thời gian tạo</span>
                <span className="text-text tabular-nums">{formatDateTime(selectedTx.thoiGian)}</span>
              </div>
              {selectedTx.tenNganHang && (
                <div className="flex justify-between py-1.5 border-b border-border/70">
                  <span className="text-text-muted">Ngân hàng nhận</span>
                  <span className="font-medium text-text">
                    {selectedTx.tenNganHang} ({selectedTx.soTaiKhoan})
                    {selectedTx.tenChuTaiKhoan ? ` - ${selectedTx.tenChuTaiKhoan}` : ''}
                  </span>
                </div>
              )}
              {selectedTx.ghiChu && (
                <div className="py-2 px-3 text-text-secondary bg-surface-subtle rounded-lg border border-border">
                  Ghi chú: {selectedTx.ghiChu}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN ĐÃ CHUYỂN TIỀN THỦ CÔNG (PROOF OF TRANSFER) */}
      <Modal
        isOpen={!!approvingTx}
        onClose={() => setApprovingTx(null)}
        title="Xác nhận hoàn tất chuyển tiền"
        subtitle={approvingTx ? `Đối soát giao dịch #${approvingTx.maGiaoDich}` : undefined}
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setApprovingTx(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!isConfirmedTransfer || approveWithdrawalMutation.isPending}
              onClick={() => {
                if (!approvingTx) return;
                approveWithdrawalMutation.mutate({
                  id: approvingTx.maGiaoDich,
                  refCode: bankRefCode.trim() || undefined,
                });
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {approveWithdrawalMutation.isPending && <Spinner size="sm" color="current" />}
              <span>Xác nhận &amp; Cập nhật sổ cái</span>
            </button>
          </>
        }
      >
        {approvingTx && (
          <div className="space-y-4 text-xs">
            {/* Tóm tắt tiền và tài khoản */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền chuyển:</span>
                <span className="text-base font-extrabold text-emerald-700">{formatVND(approvingTx.soTien)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Người nhận:</span>
                <span className="font-bold text-slate-800">{approvingTx.nguoiThucHien}</span>
              </div>
              {approvingTx.tenNganHang && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tài khoản nhận:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {approvingTx.tenNganHang} - {approvingTx.soTaiKhoan} ({approvingTx.tenChuTaiKhoan || approvingTx.nguoiThucHien})
                  </span>
                </div>
              )}
            </div>

            {/* Ô nhập mã tham chiếu ngân hàng */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mã tham chiếu ngân hàng (Mã FT / SePay Ref):
              </label>
              <input
                type="text"
                placeholder="VD: FT2411220001 (khuyến nghị để làm bằng chứng đối soát)"
                value={bankRefCode}
                onChange={(e) => setBankRefCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Mã này sẽ hiển thị trên biên nhận của khách hàng để minh bạch thông tin giao dịch.
              </span>
            </div>

            {/* Checkbox cam kết */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer text-amber-900">
              <input
                type="checkbox"
                checked={isConfirmedTransfer}
                onChange={(e) => setIsConfirmedTransfer(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] leading-relaxed">
                <strong>Cam kết trách nhiệm:</strong> Tôi xác nhận đã trực tiếp chuyển khoản thành công số tiền <strong>{formatVND(approvingTx.soTien)}</strong> tới đúng số tài khoản thụ hưởng ngoài ngân hàng.
              </span>
            </label>
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
              className="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-subtle text-xs font-medium text-text-secondary cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={rejectWithdrawalMutation.isPending}
              onClick={handleConfirmRejectWithdrawal}
              className="px-4 py-2 rounded-lg bg-danger-text hover:opacity-90 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-opacity"
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
          className="w-full p-2.5 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-text-subtle focus:outline-none focus:border-danger-text"
        />
      </Modal>
    </div>
  );
};
