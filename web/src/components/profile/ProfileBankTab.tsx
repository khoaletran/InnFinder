import React, { useId, useState } from 'react';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CreditCard, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { LinkBankAccountModal } from '@/components/common/LinkBankAccountModal';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusBadge } from '@/components/common/StatusBadge';
import { VIETNAM_BANKS } from '@/constants/banks';
import { authUserService } from '@/services/authUser.service';
import type { BankAccountResponse } from '@/types/auth-user.types';
import { maskBankAccount } from '@/utils/security';

function getBankLogo(bankName?: string): string | null {
  if (!bankName) return null;
  const normalized = bankName.trim().toLowerCase();
  const found = VIETNAM_BANKS.find(
    (b) =>
      b.shortName.toLowerCase() === normalized ||
      b.code.toLowerCase() === normalized ||
      normalized.includes(b.shortName.toLowerCase()) ||
      b.fullName.toLowerCase().includes(normalized),
  );
  return found?.logoUrl || null;
}

const ProfileBankTab: React.FC = () => {
  const queryClient = useQueryClient();
  const sectionHeadingId = useId();

  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingBank, setDeletingBank] = useState<BankAccountResponse | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [liveStatus, setLiveStatus] = useState('');

  const {
    data: bankAccounts = [],
    isLoading: isLoadingBanks,
    error: banksError,
    refetch: refetchBanks,
  } = useQuery({
    queryKey: ['users', 'bank-accounts'],
    queryFn: authUserService.getMyBankAccounts,
  });

  const addBankMutation = useMutation({
    mutationFn: authUserService.addBankAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      setLiveStatus('Liên kết tài khoản ngân hàng thành công.');
      toast.success('Liên kết tài khoản ngân hàng thành công!');
      setShowAddModal(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi liên kết ngân hàng';
      setLiveStatus(msg);
      toast.error(msg);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: authUserService.deleteBankAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      setLiveStatus('Đã hủy liên kết ngân hàng.');
      toast.success('Đã hủy liên kết ngân hàng');
      setDeletingBank(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Không thể xóa ngân hàng';
      setLiveStatus(msg);
      toast.error(msg);
    },
  });

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section aria-labelledby={sectionHeadingId}>
      <div role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </div>

      <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 id={sectionHeadingId} className="text-base font-bold text-slate-900">
              Tài khoản ngân hàng liên kết
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Dùng để nhận hoàn tiền hoặc rút số dư ví về tài khoản cá nhân
            </p>
          </div>
          <AppButton
            variant="primary"
            size="md"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài khoản</span>
          </AppButton>
        </div>

        {banksError ? (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Không thể tải danh sách tài khoản ngân hàng</span>
            </div>
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => void refetchBanks()}
              className="min-h-[44px]"
            >
              Thử lại
            </AppButton>
          </div>
        ) : isLoadingBanks ? (
          <SkeletonList variant="rows" count={2} />
        ) : bankAccounts.length > 0 ? (
          <div className="space-y-3">
            {bankAccounts.map((b, idx) => {
              const logoUrl = getBankLogo(b.tenNganHang);
              const itemKey = String(b.id ?? `${b.tenNganHang}-${idx}`);
              const isRevealed = Boolean(revealedKeys[itemKey]);
              const shownAccountNumber = isRevealed
                ? b.soTaiKhoan
                : maskBankAccount(b.soTaiKhoan);

              return (
                <div
                  key={itemKey}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`Logo ngân hàng ${b.tenNganHang}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-teal-50 flex items-center justify-center">
                          <span className="text-xs font-bold text-teal-800">
                            {(b.tenNganHang || 'NH').substring(0, 3).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900">{b.tenNganHang}</h3>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-slate-700 font-mono tracking-wider">
                          {shownAccountNumber}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleReveal(itemKey)}
                          aria-pressed={isRevealed}
                          aria-label={
                            isRevealed
                              ? `Ẩn số tài khoản ${b.tenNganHang}`
                              : `Hiện số tài khoản ${b.tenNganHang}`
                          }
                          className="min-h-[36px] min-w-[36px] px-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-slate-200/70 inline-flex items-center justify-center transition-colors cursor-pointer"
                        >
                          {isRevealed ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {b.tenChuTaiKhoan && (
                        <p className="text-xs text-slate-600 uppercase">{b.tenChuTaiKhoan}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <StatusBadge label="Đã liên kết" tone="success" />
                    {b.id && (
                      <button
                        type="button"
                        onClick={() => setDeletingBank(b)}
                        aria-label={`Hủy liên kết tài khoản ${b.tenNganHang} ${maskBankAccount(b.soTaiKhoan)}`}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-600 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Chưa liên kết tài khoản ngân hàng"
            description="Thêm tài khoản ngân hàng chính chủ để nhận hoàn cọc hoặc rút tiền nhanh chóng."
            icon={<CreditCard className="w-6 h-6" />}
            action={
              <AppButton
                variant="primary"
                size="md"
                onClick={() => setShowAddModal(true)}
                className="min-h-[44px]"
              >
                Liên kết ngân hàng ngay
              </AppButton>
            }
          />
        )}
      </Card>

      {/* Modal thêm tài khoản ngân hàng */}
      <LinkBankAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (payload) => { await addBankMutation.mutateAsync(payload); }}
        isSubmitting={addBankMutation.isPending}
      />

      {deletingBank && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-bank-modal-title"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 id="delete-bank-modal-title" className="text-base font-bold text-slate-900">
              Xác nhận hủy liên kết ngân hàng
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn hủy liên kết tài khoản{' '}
              <strong className="text-slate-900">{deletingBank.tenNganHang}</strong> (
              <span className="font-mono">{maskBankAccount(deletingBank.soTaiKhoan)}</span>) khỏi hồ sơ
              của mình không?
            </p>
            <div className="flex gap-2 pt-1">
              <AppButton
                variant="secondary"
                size="md"
                fullWidth
                disabled={deleteBankMutation.isPending}
                onClick={() => setDeletingBank(null)}
                className="min-h-[44px]"
              >
                Hủy bỏ
              </AppButton>
              <AppButton
                variant="danger"
                size="md"
                fullWidth
                isLoading={deleteBankMutation.isPending}
                onClick={() => deletingBank.id && deleteBankMutation.mutate(deletingBank.id)}
                className="min-h-[44px]"
              >
                Hủy liên kết
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfileBankTab;
