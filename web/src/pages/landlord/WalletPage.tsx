import { useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { AddBankAccountModal } from '@/components/landlord/AddBankAccountModal';
import { ConfirmWithdrawModal } from '@/components/landlord/ConfirmWithdrawModal';
import { TransactionReceiptModal } from '@/components/landlord/TransactionReceiptModal';
import { WithdrawModal } from '@/components/landlord/WithdrawModal';
import { transactionDirection, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '@/components/landlord/walletTransactions';
import { landlordService } from '@/services/landlord.service';
import type { BankAccountItem } from '@/types/landlord.types';
import { formatDateTime, formatVND } from '@/utils/formatters';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer';
const PAGE_SIZE = 10;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Không thể xử lý yêu cầu';

export function WalletPage() {
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [withdrawal, setWithdrawal] = useState<{ amount: number; account: BankAccountItem } | null>(null);
  const [deleteAccount, setDeleteAccount] = useState<BankAccountItem | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const walletQuery = useQuery({ queryKey: ['landlord', 'wallet'], queryFn: landlordService.getWalletInfo, refetchInterval: 30000 });
  const dateInvalid = !!fromDate && !!toDate && fromDate > toDate;
  const txQuery = useQuery({
    queryKey: ['landlord', 'transactions', search, type, status, fromDate, toDate, page],
    queryFn: () => landlordService.getTransactionsPage({ search, type, status: status || undefined,
      fromDate: fromDate || undefined, toDate: toDate || undefined, page: page - 1, size: PAGE_SIZE }),
    enabled: !dateInvalid, refetchInterval: 30000,
  });
  const receiptQuery = useQuery({ queryKey: ['landlord', 'receipt', receiptId],
    queryFn: () => landlordService.getReceipt(receiptId!), enabled: !!receiptId, refetchInterval: 15000 });
  const wallet = walletQuery.data;
  const transactions = txQuery.data?.content ?? [];
  const accounts = [...(wallet?.dsTaiKhoanNganHang ?? [])].sort((a, b) => Number(!!b.macDinh) - Number(!!a.macDinh));

  const invalidateWallet = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['landlord', 'wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['landlord', 'transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['landlord', 'dashboard-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] }),
    ]);
  };
  const withdrawMutation = useMutation({
    mutationFn: ({ amount, account }: { amount: number; account: BankAccountItem }) => {
      if (!account.id) throw new Error('Vui lòng tải lại danh sách ngân hàng');
      return landlordService.requestWithdraw(amount, account.id);
    },
    onSuccess: async (tx) => {
      setWithdrawal(null);
      await invalidateWallet();
      setReceiptId(tx.maGiaoDich);
      toast.success('Đã tạo yêu cầu rút tiền, đang chờ đối soát');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const addBankMutation = useMutation({
    mutationFn: ({ number, bank, holder }: { number: string; bank: string; holder?: string }) => landlordService.addBankAccount(number, bank, holder),
    onSuccess: async () => { await invalidateWallet(); toast.success('Đã liên kết ngân hàng'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => landlordService.deleteBankAccount(id),
    onSuccess: async () => { setDeleteAccount(null); await invalidateWallet(); toast.success('Đã hủy liên kết ngân hàng'); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const defaultMutation = useMutation({
    mutationFn: (id: number) => landlordService.setDefaultBankAccount(id),
    onSuccess: async () => { await invalidateWallet(); toast.success('Đã đặt ngân hàng mặc định'); },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const bankBusy = deleteMutation.isPending || defaultMutation.isPending || addBankMutation.isPending || withdrawMutation.isPending;
  const totalElements = dateInvalid ? 0 : txQuery.data?.totalElements ?? 0;
  const pageCount = Math.max(1, txQuery.data?.totalPages ?? 1);
  const currentPage = (txQuery.data?.number ?? 0) + 1;
  const visible = dateInvalid ? [] : transactions;
  const resetFilters = () => { setSearch(''); setType(''); setStatus(''); setFromDate(''); setToDate(''); setPage(1); };
  const refresh = async () => {
    try {
      await Promise.all([walletQuery.refetch({ throwOnError: true }), ...(dateInvalid ? [] : [txQuery.refetch({ throwOnError: true })])]);
      toast.success('Đã cập nhật ví và giao dịch');
    } catch (error) { toast.error(errorMessage(error)); }
  };

  return <div className="space-y-6">
    {walletQuery.isError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Không tải được dữ liệu ví: {errorMessage(walletQuery.error)}. <button className="underline" onClick={() => void refresh()}>Thử lại</button>
    </div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[
        ['Số dư khả dụng', wallet?.soDu], ['Tổng đã nhận', wallet?.tongDaThu],
        ['Tổng đã rút', wallet?.tongDaRut], ['Đang chờ rút', wallet?.dangChoRut],
      ].map(([label, value], index) => <Card key={String(label)} className={`p-5 rounded-2xl ${index === 0 ? 'bg-white border border-teal-200/80 shadow-xs relative overflow-hidden' : 'bg-white border border-slate-200/80 shadow-xs'}`}>
        {index === 0 && <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600 rounded-l-2xl" />}
        <Card.Header><Card.Title className="text-xs uppercase tracking-wide font-bold text-slate-500">{label}</Card.Title></Card.Header>
        <Card.Content><p className="text-2xl font-black text-slate-900">{typeof value === 'number' ? formatVND(value) : '—'}</p></Card.Content>
      </Card>)}
    </div>
    <div className="flex justify-end">
      <button className="rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer transition-colors shadow-2xs" disabled={!wallet || walletQuery.isError || walletQuery.isLoading || bankBusy} onClick={() => setWithdrawOpen(true)}>Rút tiền về ngân hàng</button>
    </div>

    <Card className="p-5 rounded-2xl bg-white border border-slate-200">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div><Card.Title>Tài khoản ngân hàng liên kết</Card.Title><Card.Description>Chọn ngân hàng mặc định để nhận tiền rút.</Card.Description></div>
        <button className={buttonClass} disabled={bankBusy} onClick={() => setAddBankOpen(true)}><Plus className="mr-1 inline h-4 w-4" />Thêm tài khoản</button>
      </Card.Header>
      <Card.Content>
        {walletQuery.isLoading ? <p className="text-sm text-slate-500">Đang tải ngân hàng...</p> : walletQuery.isError ? <p className="text-sm text-red-600">Chưa tải được danh sách ngân hàng.</p> : accounts.length === 0 ? <p className="text-sm text-slate-500">Chưa liên kết ngân hàng. Thêm tài khoản để rút tiền.</p> :
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{accounts.map((account) => <div key={account.id ?? `${account.tenNganHang}-${account.soTaiKhoan}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-start gap-3"><Landmark className="h-5 w-5 text-cyan-700 shrink-0" /><div className="min-w-0 flex-1">
              <p className="font-semibold">{account.tenNganHang} {account.macDinh && <span className="text-xs text-cyan-700">· Mặc định</span>}</p>
              <p className="font-mono text-sm break-all">{account.soTaiKhoan}</p><p className="text-xs text-slate-500">{account.tenChuTaiKhoan || 'Chưa cung cấp tên chủ tài khoản'}</p>
            </div></div>
            <div className="flex flex-wrap gap-2">
              {!account.macDinh && <button className={buttonClass} disabled={!account.id || bankBusy} onClick={() => defaultMutation.mutate(account.id!)}><Star className="inline h-3.5 w-3.5 mr-1" />Đặt mặc định</button>}
              <button className={`${buttonClass} text-red-600`} disabled={!account.id || bankBusy} onClick={() => setDeleteAccount(account)}><Trash2 className="inline h-3.5 w-3.5 mr-1" />Hủy liên kết</button>
            </div>
          </div>)}</div>}
      </Card.Content>
    </Card>

    <Card className="p-0 rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <Card.Header className="p-5 flex flex-row items-center justify-between gap-3">
        <div><Card.Title>Lịch sử giao dịch</Card.Title></div>
        <button title="Làm mới" aria-label="Làm mới ví và giao dịch" className={buttonClass} disabled={walletQuery.isFetching || txQuery.isFetching} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" /></button>
      </Card.Header>
      <Card.Content className="p-0">
        <div className="p-5 border-y border-slate-100 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <label className="text-xs space-y-1">Tìm kiếm<input className={inputClass} value={search} placeholder="Mã giao dịch, phòng, nội dung..." onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>
          <label className="text-xs space-y-1">Loại giao dịch<select className={inputClass} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">Tất cả loại</option><option value="COC">Cọc giữ chân / Thế chân</option><option value="FEE">Hoa hồng sàn</option><option value="WITHDRAW">Rút tiền</option><option value="REFUND">Hoàn tiền</option>
          </select></label>
          <label className="text-xs space-y-1">Trạng thái<select className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Tất cả trạng thái</option>{Object.entries(TRANSACTION_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label className="text-xs space-y-1">Từ ngày<input type="date" className={inputClass} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} /></label>
          <label className="text-xs space-y-1">Đến ngày<input type="date" className={inputClass} value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} /></label>
          <button className={`${buttonClass} self-end`} onClick={resetFilters}>Xóa bộ lọc</button>
          {dateInvalid && <p role="alert" className="text-xs text-red-600 sm:col-span-2">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
        </div>
        {type === 'FEE' && <p className="px-5 pt-4 text-xs text-slate-500">Bao gồm khoản nhận cọc đã khấu trừ hoa hồng; số tiền trong bảng là tiền ghi nhận vào ví. Xem biên nhận để biết phí đã trừ.</p>}
        {txQuery.isError && <p role="alert" className="p-5 text-sm text-red-600">Không tải được giao dịch: {errorMessage(txQuery.error)}. <button className="underline" onClick={() => void refresh()}>Thử lại</button></p>}
        {txQuery.isLoading ? <p className="p-8 text-center text-sm text-slate-500">Đang tải giao dịch...</p> : !txQuery.isError && totalElements === 0 ? <p className="p-8 text-center text-sm text-slate-500">{search || type || status || fromDate || toDate ? 'Không có giao dịch phù hợp bộ lọc.' : 'Chưa phát sinh giao dịch.'}</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Giao dịch', 'Loại', 'Số tiền', 'Trạng thái', 'Thời gian'].map((label) => <th key={label} className="px-5 py-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{visible.map((tx) => {
              const direction = transactionDirection(tx);
              const failed = tx.trangThai === 'THAT_BAI';
              return <tr key={tx.maGiaoDich} onClick={() => setReceiptId(tx.maGiaoDich)} className="cursor-pointer hover:bg-cyan-50/40">
                <td className="px-5 py-4 min-w-56"><button className="font-mono text-cyan-700 hover:underline text-left" onClick={() => setReceiptId(tx.maGiaoDich)}>#{tx.maGiaoDich}</button><p className="mt-1 text-xs text-slate-500 max-w-sm line-clamp-2">{tx.noiDung}</p></td>
                <td className="px-5 py-4"><span>{TRANSACTION_TYPES[tx.loaiGiaoDich] ?? tx.loaiGiaoDich}</span>{(tx.phiHoaHong ?? 0) > 0 && <p className="text-xs text-amber-700 mt-1">Đã trừ phí {formatVND(tx.phiHoaHong!)}</p>}</td>
                <td className={`px-5 py-4 font-semibold whitespace-nowrap ${failed ? 'text-slate-400' : direction === 'in' ? 'text-emerald-700' : direction === 'out' ? 'text-amber-700' : 'text-slate-700'}`}>
                  {failed ? '' : direction === 'in' ? '+' : direction === 'out' ? '−' : ''}{formatVND(tx.soTien)}{failed && <p className="text-xs font-normal">Không quyết toán</p>}
                </td>
                <td className="px-5 py-4"><span className={`rounded-lg px-2 py-1 text-xs whitespace-nowrap ${failed ? 'bg-red-50 text-red-700' : tx.trangThai === 'CHO_THANH_TOAN' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{TRANSACTION_STATUSES[tx.trangThai]}</span></td>
                <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(tx.ngayGiaoDich)}</td>
              </tr>;
            })}</tbody>
          </table></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
          <span>{totalElements} giao dịch · Trang {currentPage}/{pageCount}</span><div className="flex gap-2"><button className={buttonClass} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><button className={buttonClass} disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Sau</button></div>
        </div>
      </Card.Content>
    </Card>

    {addBankOpen && <AddBankAccountModal onClose={() => setAddBankOpen(false)} loading={addBankMutation.isPending} onSave={async (number, bank, holder) => { await addBankMutation.mutateAsync({ number, bank, holder }); }} />}
    <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} availableBalance={wallet?.soDu ?? 0} bankAccounts={accounts}
      onConfirm={(amount, account) => { setWithdrawOpen(false); setWithdrawal({ amount, account }); }}
      onAddAccount={async (number, bank, holder) => { await addBankMutation.mutateAsync({ number, bank, holder }); }} loading={addBankMutation.isPending} />
    <ConfirmWithdrawModal isOpen={!!withdrawal} onClose={() => { if (!withdrawMutation.isPending) setWithdrawal(null); }} onConfirm={() => { if (withdrawal && !withdrawMutation.isPending) withdrawMutation.mutate(withdrawal); }} amount={withdrawal?.amount ?? 0} account={withdrawal?.account ?? null} loading={withdrawMutation.isPending} />
    {receiptId && receiptQuery.isLoading && <p role="status" className="text-sm">Đang tải biên nhận...</p>}
    {receiptId && receiptQuery.error && <p role="alert" className="text-sm text-red-600">Không tải được biên nhận. <button onClick={() => void receiptQuery.refetch()}>Thử lại</button></p>}
    <TransactionReceiptModal transaction={receiptQuery.data ?? null} onClose={() => setReceiptId(null)} />
    {deleteAccount && <Modal isOpen onClose={() => { if (!deleteMutation.isPending) setDeleteAccount(null); }} title="Hủy liên kết ngân hàng" footer={<button className={`${buttonClass} text-red-600`} disabled={deleteMutation.isPending || !deleteAccount.id} onClick={() => deleteMutation.mutate(deleteAccount.id!)}>{deleteMutation.isPending ? 'Đang xử lý...' : 'Xác nhận hủy liên kết'}</button>}>
      <p className="text-sm">Hủy liên kết {deleteAccount.tenNganHang} · {deleteAccount.soTaiKhoan}?</p>
      <p className="mt-2 text-xs text-slate-500">Các giao dịch và yêu cầu rút tiền đã tạo vẫn giữ thông tin người nhận. Khi xóa ngân hàng mặc định, tài khoản còn lại đầu tiên sẽ được chọn thay thế.</p>
    </Modal>}
  </div>;
}
