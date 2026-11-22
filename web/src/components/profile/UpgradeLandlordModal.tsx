import React, { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { BankSelect } from '@/components/common/BankSelect';
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

  const [upgradeCccd, setUpgradeCccd] = useState('');
  const [upgradeFrontUrl, setUpgradeFrontUrl] = useState('');
  const [upgradeBackUrl, setUpgradeBackUrl] = useState('');
  const [upgradeBank, setUpgradeBank] = useState('Vietcombank');
  const [upgradeAccNum, setUpgradeAccNum] = useState('');
  const [upgradeAccHolder, setUpgradeAccHolder] = useState('');

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
    const parsed = upgradeLandlordSchema.safeParse({
      cccd: upgradeCccd.trim(),
      anhCccdTruoc: upgradeFrontUrl,
      anhCccdSau: upgradeBackUrl,
      tenNganHang: upgradeBank.trim(),
      soTaiKhoan: upgradeAccNum.trim(),
      tenChuTaiKhoan: upgradeAccHolder.trim().toUpperCase(),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Hồ sơ nâng cấp chưa hợp lệ');
      return;
    }
    upgradeMutation.mutate(parsed.data);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
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
