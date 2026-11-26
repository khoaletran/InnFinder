import React, { useEffect, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { BankSelect } from '@/components/common/BankSelect';
import { getBankByShortName } from '@/constants/banks';
import { bankService } from '@/services/bank.service';
import { bankAccountSchema } from '@/utils/validators';

export interface LinkBankAccountPayload {
  tenNganHang: string;
  soTaiKhoan: string;
  tenChuTaiKhoan?: string;
}

interface LinkBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: LinkBankAccountPayload) => Promise<void>;
  isSubmitting?: boolean;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  defaultBankName?: string;
}

export const LinkBankAccountModal: React.FC<LinkBankAccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  title = 'Liên kết ngân hàng mới',
  subtitle = 'Số tài khoản gồm từ 6 đến 20 chữ số',
  submitLabel = 'Liên kết',
  defaultBankName = 'MBBank',
}) => {
  const [bankName, setBankName] = useState(defaultBankName);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isCheckingBank, setIsCheckingBank] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [bankVerificationMsg, setBankVerificationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setBankName(defaultBankName);
      setAccountNumber('');
      setAccountHolder('');
      setIsBankVerified(false);
      setBankVerificationMsg(null);
    }
  }, [isOpen, defaultBankName]);

  if (!isOpen) return null;

  const handleLookupBank = async () => {
    if (!accountNumber || accountNumber.length < 6) {
      toast.error('Vui lòng nhập số tài khoản từ 6 đến 20 số');
      return;
    }
    const selectedBank = getBankByShortName(bankName);
    if (!selectedBank?.bin) {
      toast.error('Không tìm thấy mã định danh cho ngân hàng đã chọn');
      return;
    }
    try {
      setIsCheckingBank(true);
      setBankVerificationMsg(null);
      const res = await bankService.lookupAccount({
        bin: selectedBank.bin,
        soTaiKhoan: accountNumber.trim(),
      });
      if (res.hopLe) {
        setAccountHolder(res.tenChuTaiKhoan);
        setIsBankVerified(true);
        setBankVerificationMsg(res.tenChuTaiKhoan);
        toast.success(`Xác thực Napas thành công: ${res.tenChuTaiKhoan}`);
      } else {
        setIsBankVerified(false);
        setBankVerificationMsg(null);
        toast.error(res.thongBao || 'Số tài khoản không tồn tại tại ngân hàng đã chọn');
      }
    } catch (err: unknown) {
      setIsBankVerified(false);
      setBankVerificationMsg(null);
      toast.error(err instanceof Error ? err.message : 'Lỗi tra cứu tài khoản');
    } finally {
      setIsCheckingBank(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || accountNumber.length < 6) {
      toast.error('Số tài khoản phải gồm từ 6 đến 20 chữ số');
      return;
    }

    // Nếu chưa bấm kiểm tra, tự động tra cứu Napas trước khi lưu
    let finalAccountHolder = accountHolder.trim().toUpperCase();
    if (!isBankVerified || !finalAccountHolder) {
      const selectedBank = getBankByShortName(bankName);
      if (!selectedBank?.bin) {
        toast.error('Không tìm thấy thông tin ngân hàng');
        return;
      }
      try {
        setIsCheckingBank(true);
        const res = await bankService.lookupAccount({
          bin: selectedBank.bin,
          soTaiKhoan: accountNumber.trim(),
        });
        if (!res.hopLe) {
          toast.error(res.thongBao || 'Số tài khoản không tồn tại tại ngân hàng đã chọn');
          return;
        }
        finalAccountHolder = res.tenChuTaiKhoan;
        setAccountHolder(res.tenChuTaiKhoan);
        setIsBankVerified(true);
        setBankVerificationMsg(res.tenChuTaiKhoan);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Lỗi tra cứu tài khoản');
        return;
      } finally {
        setIsCheckingBank(false);
      }
    }

    const parsed = bankAccountSchema.safeParse({
      tenNganHang: bankName.trim(),
      soTaiKhoan: accountNumber.trim(),
      tenChuTaiKhoan: finalAccountHolder || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Thông tin ngân hàng chưa hợp lệ');
      return;
    }

    await onSubmit({
      tenNganHang: parsed.data.tenNganHang,
      soTaiKhoan: parsed.data.soTaiKhoan,
      tenChuTaiKhoan: parsed.data.tenChuTaiKhoan,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-3">
          <BankSelect
            label="Ngân hàng"
            required
            value={bankName}
            onChange={(shortName) => {
              setBankName(shortName);
              setIsBankVerified(false);
              setBankVerificationMsg(null);
            }}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tài khoản
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={20}
                placeholder="Nhập 6–20 chữ số"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\D/g, ''));
                  setIsBankVerified(false);
                  setBankVerificationMsg(null);
                }}
                className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600"
              />
              <AppButton
                type="button"
                variant="secondary"
                size="md"
                onClick={handleLookupBank}
                disabled={isCheckingBank || accountNumber.length < 6}
                isLoading={isCheckingBank}
              >
                <Search className="w-3.5 h-3.5 mr-1" />
                Kiểm tra
              </AppButton>
            </div>
          </div>

          {isBankVerified && bankVerificationMsg && (
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Xác thực Napas: <strong className="font-bold">{bankVerificationMsg}</strong>
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên chủ tài khoản (Hệ thống tự điền)
            </label>
            <input
              type="text"
              placeholder="Tên chủ tài khoản sẽ tự động hiển thị"
              value={accountHolder}
              readOnly={isBankVerified}
              onChange={(e) => setAccountHolder(e.target.value)}
              className={`w-full h-10 px-3 rounded-xl border border-slate-200 text-sm uppercase font-semibold text-slate-900 focus:outline-none focus:border-teal-600 ${
                isBankVerified ? 'bg-slate-100 text-slate-700 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <AppButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={onClose}
            >
              Hủy
            </AppButton>
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={isSubmitting || isCheckingBank}
              isLoading={isSubmitting}
            >
              {submitLabel}
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
};
