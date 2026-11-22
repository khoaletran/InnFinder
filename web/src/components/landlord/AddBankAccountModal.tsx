import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { VIETNAM_BANKS } from '@/constants/banks';
import { bankAccountSchema } from '@/utils/validators';

export function AddBankAccountModal({ onClose, onSave, loading }: {
  onClose: () => void;
  onSave: (number: string, bank: string, holder?: string) => Promise<void>;
  loading: boolean;
}) {
  const [number, setNumber] = useState('');
  const [bank, setBank] = useState(VIETNAM_BANKS[0]?.shortName ?? 'Vietcombank');
  const [holder, setHolder] = useState('');
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const result = bankAccountSchema.safeParse({ soTaiKhoan: number.trim(), tenNganHang: bank, tenChuTaiKhoan: holder.trim() || undefined });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    try { await onSave(result.data.soTaiKhoan, result.data.tenNganHang, result.data.tenChuTaiKhoan); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể thêm ngân hàng'); }
  };
  return <Modal isOpen onClose={() => { if (!loading) onClose(); }} title="Liên kết tài khoản ngân hàng">
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <label className="block text-sm">Ngân hàng
        <select value={bank} onChange={(e) => setBank(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3">
          {VIETNAM_BANKS.map((item) => <option key={item.shortName} value={item.shortName}>{item.shortName}</option>)}
        </select>
      </label>
      <label className="block text-sm">Số tài khoản
        <input value={number} inputMode="numeric" onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-xl border border-slate-200 p-3" />
      </label>
      <label className="block text-sm">Tên chủ tài khoản
        <input value={holder} maxLength={100} onChange={(e) => setHolder(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Đang lưu...' : 'Liên kết ngân hàng'}</button>
    </form>
  </Modal>;
}
