import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { BankSelect } from '@/components/common/BankSelect';
import { LANDLORD_POLICY_SECTIONS } from '@/pages/public/BusinessPages';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { upgradeLandlordSchema } from '@/utils/validators';

interface UpgradeLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeLandlordModal: React.FC<UpgradeLandlordModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const titleId = useId();
  const cccdId = useId();
  const frontId = useId();
  const backId = useId();
  const accNumId = useId();
  const accHolderId = useId();
  const policyAgreeId = useId();
  const policyScrollRef = useRef<HTMLDivElement>(null);

  const [upgradeCccd, setUpgradeCccd] = useState('');
  const [upgradeFrontUrl, setUpgradeFrontUrl] = useState('');
  const [upgradeBackUrl, setUpgradeBackUrl] = useState('');
  const [upgradeBank, setUpgradeBank] = useState('Vietcombank');
  const [upgradeAccNum, setUpgradeAccNum] = useState('');
  const [upgradeAccHolder, setUpgradeAccHolder] = useState('');
  const [hasReadPolicy, setHasReadPolicy] = useState(false);
  const [agreedPolicy, setAgreedPolicy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setHasReadPolicy(false);
      setAgreedPolicy(false);
      return;
    }
    const el = policyScrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) {
      setHasReadPolicy(true);
    }
  }, [isOpen]);

  const handlePolicyScroll = () => {
    const el = policyScrollRef.current;
    if (!el || hasReadPolicy) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) {
      setHasReadPolicy(true);
    }
  };

  const upgradeMutation = useMutation({
    mutationFn: authUserService.upgradeToLandlord,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'my-landlord-request'] });
      toast.success('Đã gửi hồ sơ đăng ký Chủ trọ! Quản trị viên sẽ kiểm duyệt trong 24h.');
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi yêu cầu nâng cấp');
    },
  });

  if (!isOpen) return null;

  const handleUpgradeToLandlord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasReadPolicy) {
      toast.error('Vui lòng cuộn đọc hết toàn bộ Chính sách Uy tín & Xử phạt Chủ trọ trước khi đồng ý');
      return;
    }
    const parsed = upgradeLandlordSchema.safeParse({
      cccd: upgradeCccd.trim(),
      anhCccdTruoc: upgradeFrontUrl,
      anhCccdSau: upgradeBackUrl,
      tenNganHang: upgradeBank.trim(),
      soTaiKhoan: upgradeAccNum.trim(),
      tenChuTaiKhoan: upgradeAccHolder.trim().toUpperCase(),
      dongYChinhSachChuTro: agreedPolicy,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Hồ sơ nâng cấp chưa hợp lệ');
      return;
    }
    const {
      cccd,
      anhCccdTruoc,
      anhCccdSau,
      tenNganHang,
      soTaiKhoan,
      tenChuTaiKhoan,
    } = parsed.data;
    upgradeMutation.mutate({
      cccd,
      anhCccdTruoc,
      anhCccdSau,
      tenNganHang,
      soTaiKhoan,
      tenChuTaiKhoan,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-4">
        <div>
          <h3 id={titleId} className="text-base font-bold text-slate-900">
            Đăng ký nâng cấp vai trò Chủ trọ
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Cung cấp CCCD 12 số, ảnh 2 mặt và tài khoản ngân hàng nhận thanh toán
          </p>
        </div>

        <form onSubmit={handleUpgradeToLandlord} className="space-y-3">
          <div>
            <label htmlFor={cccdId} className="block text-xs font-semibold text-slate-700 mb-1">
              Số CCCD (12 chữ số) *
            </label>
            <input
              id={cccdId}
              type="text"
              inputMode="numeric"
              maxLength={12}
              placeholder="VD: 079203001234"
              value={upgradeCccd}
              onChange={(e) => setUpgradeCccd(e.target.value.replace(/\D/g, ''))}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={frontId} className="block text-xs font-semibold text-slate-700 mb-1">
                Ảnh mặt trước CCCD *
              </label>
              <label
                htmlFor={frontId}
                className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-2 hover:border-teal-500 transition-colors"
              >
                {upgradeFrontUrl ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã tải lên
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">Tải ảnh mặt trước</span>
                )}
                <input
                  id={frontId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try {
                        const url = await uploadService.uploadImage(f, 'cccd');
                        setUpgradeFrontUrl(url);
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Lỗi tải ảnh mặt trước');
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label htmlFor={backId} className="block text-xs font-semibold text-slate-700 mb-1">
                Ảnh mặt sau CCCD *
              </label>
              <label
                htmlFor={backId}
                className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-2 hover:border-teal-500 transition-colors"
              >
                {upgradeBackUrl ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã tải lên
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">Tải ảnh mặt sau</span>
                )}
                <input
                  id={backId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try {
                        const url = await uploadService.uploadImage(f, 'cccd');
                        setUpgradeBackUrl(url);
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : 'Lỗi tải ảnh mặt sau');
                      }
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <BankSelect
            label="Ngân hàng nhận thanh toán"
            required
            value={upgradeBank}
            onChange={(shortName) => setUpgradeBank(shortName)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={accNumId} className="block text-xs font-semibold text-slate-700 mb-1">
                Số tài khoản (6–20 số) *
              </label>
              <input
                id={accNumId}
                type="text"
                inputMode="numeric"
                maxLength={20}
                value={upgradeAccNum}
                onChange={(e) => setUpgradeAccNum(e.target.value.replace(/\D/g, ''))}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <div>
              <label
                htmlFor={accHolderId}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Chủ tài khoản *
              </label>
              <input
                id={accHolderId}
                type="text"
                value={upgradeAccHolder}
                onChange={(e) => setUpgradeAccHolder(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm uppercase text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldAlert className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Chính sách Uy tín &amp; Xử phạt Chủ trọ *</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    hasReadPolicy
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {hasReadPolicy ? 'Đã đọc hết' : 'Cuộn đọc hết để đồng ý'}
                </span>
                <Link
                  to="/landlord-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Mở toàn trang ở tab mới"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 hover:underline"
                >
                  Mở rộng
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            <div
              ref={policyScrollRef}
              onScroll={handlePolicyScroll}
              className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 space-y-3 text-xs text-slate-600 leading-relaxed"
            >
              {LANDLORD_POLICY_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-1">
                  <p className="font-bold text-slate-800">{section.title}</p>
                  <div>{section.content}</div>
                </div>
              ))}
            </div>

            <label
              htmlFor={policyAgreeId}
              className={`flex items-start gap-2 text-xs leading-snug select-none ${
                hasReadPolicy ? 'text-slate-700 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <input
                id={policyAgreeId}
                type="checkbox"
                checked={agreedPolicy}
                disabled={!hasReadPolicy}
                onChange={(e) => setAgreedPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50 shrink-0"
              />
              <span>
                Tôi đã đọc toàn bộ <strong>Chính sách Uy tín &amp; Xử phạt Chủ trọ</strong> ở trên
                và đồng ý tuân thủ các mức trừ điểm, tạm ẩn tin hoặc khóa tài khoản nếu vi phạm.
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <AppButton
              variant="secondary"
              size="md"
              fullWidth
              onClick={onClose}
              className="min-h-[44px]"
            >
              Đóng
            </AppButton>
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!hasReadPolicy || !agreedPolicy}
              isLoading={upgradeMutation.isPending}
              className="min-h-[44px]"
            >
              Gửi hồ sơ
            </AppButton>
          </div>
        </form>
      </div>
    </div>
  );
};
