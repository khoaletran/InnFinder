import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { CheckCircle2, XCircle, Eye, Search, Info, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Modal } from '@/components/common/Modal';
import { VIETNAM_BANKS } from '@/constants/banks';
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

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin', 'transactions', submittedKeyword],
    queryFn: () => adminService.getTransactions(submittedKeyword || undefined),
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
                      <td className="py-3 px-4 font-black text-sm text-slate-900">
                        {formatVND(tx.soTien)}
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
                                onClick={() => {
                                  setApprovingTx(tx);
                                  setBankRefCode('');
                                  setIsConfirmedTransfer(false);
                                }}
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
            <div className="p-4 bg-slate-50 rounded-2xl text-center">
              <span className="text-xs text-slate-500 block mb-1">Số tiền giao dịch</span>
              <div className="text-2xl font-black text-slate-900 mb-2">
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
        <div className="space-y-3">
          {/* Gợi ý lý do từ chối nhanh */}
          <div>
            <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">Lý do thường gặp:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Sai số tài khoản nhận tiền',
                'Tên chủ tài khoản không khớp',
                'Tài khoản thụ hưởng bị khóa hoặc không nhận tiền',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    rejectReason === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={3}
            placeholder="Nhập lý do chi tiết..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
          />
        </div>
      </Modal>
    </div>
  );
};
