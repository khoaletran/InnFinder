import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@heroui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Building,
  Camera,
  CheckCircle2,
  CreditCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { BankSelect } from '@/components/common/BankSelect';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { SkeletonList } from '@/components/common/SkeletonList';
import { StatusBadge } from '@/components/common/StatusBadge';
import { VIETNAM_BANKS } from '@/constants/banks';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/utils/formatters';
import {
  bankAccountSchema,
  changePasswordSchema,
  profileUpdateSchema,
  upgradeLandlordSchema,
} from '@/utils/validators';

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

type ProfileTab = 'info' | 'bank' | 'security';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [hoVaTenDraft, setHoVaTen] = useState<string | null>(null);
  const [emailDraft, setEmail] = useState<string | null>(null);
  const [sdtDraft, setSdt] = useState<string | null>(null);

  const hoVaTen = hoVaTenDraft ?? user?.hoVaTen ?? '';
  const email = emailDraft ?? user?.email ?? '';
  const sdt = sdtDraft ?? user?.sdt ?? '';

  const isUpgradeModalOpen =
    showUpgradeModal || (searchParams.get('tab') === 'upgrade' && !user?.chuTro);

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    if (searchParams.get('tab') === 'upgrade') {
      setSearchParams({}, { replace: true });
    }
  };

  const [newBankName, setNewBankName] = useState('Vietcombank');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');

  const [upgradeCccd, setUpgradeCccd] = useState('');
  const [upgradeFrontUrl, setUpgradeFrontUrl] = useState('');
  const [upgradeBackUrl, setUpgradeBackUrl] = useState('');
  const [upgradeBank, setUpgradeBank] = useState('Vietcombank');
  const [upgradeAccNum, setUpgradeAccNum] = useState('');
  const [upgradeAccHolder, setUpgradeAccHolder] = useState('');

  const {
    data: bankAccounts = [],
    isLoading: isLoadingBanks,
    error: banksError,
    refetch: refetchBanks,
  } = useQuery({
    queryKey: ['users', 'bank-accounts'],
    queryFn: authUserService.getMyBankAccounts,
  });

  const { data: landlordRequest } = useQuery({
    queryKey: ['users', 'my-landlord-request'],
    queryFn: authUserService.getMyLandlordRequest,
    enabled: !user?.chuTro,
  });

  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: isSubmittingPwd },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const updateProfileMutation = useMutation({
    mutationFn: authUserService.updateProfile,
    onSuccess: (updated) => {
      setUser(updated);
      setHoVaTen(null);
      setEmail(null);
      setSdt(null);
      toast.success('Đã lưu thông tin hồ sơ thành công!');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật thông tin');
    },
  });

  const addBankMutation = useMutation({
    mutationFn: authUserService.addBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      toast.success('Liên kết tài khoản ngân hàng thành công!');
      setShowBankModal(false);
      setNewAccountNumber('');
      setNewAccountHolder('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi liên kết ngân hàng');
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: authUserService.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'bank-accounts'] });
      toast.success('Đã hủy liên kết ngân hàng');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa ngân hàng');
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: authUserService.upgradeToLandlord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'my-landlord-request'] });
      toast.success('Đã gửi hồ sơ đăng ký Chủ trọ! Quản trị viên sẽ kiểm duyệt trong 24h.');
      closeUpgradeModal();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Lỗi gửi yêu cầu nâng cấp');
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const url = await uploadService.uploadImage(file, 'avatars');
      const updated = await authUserService.updateProfile({
        hoVaTen: user?.hoVaTen,
        hinhDaiDien: url,
        avatarUrl: url,
        email: user?.email || email,
        sdt: user?.sdt || sdt,
      });
      setUser(updated);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật ảnh đại diện');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse({
      hoVaTen: hoVaTen.trim(),
      email: email.trim(),
      sdt: sdt.trim(),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Thông tin hồ sơ không hợp lệ');
      return;
    }
    updateProfileMutation.mutate({
      ...parsed.data,
      hinhDaiDien: user?.hinhDaiDien,
    });
  };

  const onSubmitChangePassword = async (data: {
    matKhauCu: string;
    matKhauMoi: string;
    xacNhanMatKhauMoi: string;
  }) => {
    try {
      await authUserService.changePassword(data);
      toast.success('Đổi mật khẩu thành công!');
      resetPwd();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    }
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bankAccountSchema.safeParse({
      tenNganHang: newBankName.trim(),
      soTaiKhoan: newAccountNumber.trim(),
      tenChuTaiKhoan: newAccountHolder.trim().toUpperCase() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Thông tin ngân hàng chưa hợp lệ');
      return;
    }
    addBankMutation.mutate(parsed.data);
  };

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

  const requestStatus = landlordRequest?.trangThai as string | undefined;

  return (
    <PageContainer width="narrow" className="space-y-6">
      <PageHeader
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin tài khoản, ngân hàng nhận tiền và bảo mật"
      />

      {/* Tabs: Thông tin | Ngân hàng | Bảo mật */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'info' as const, label: 'Thông tin', icon: User },
          { key: 'bank' as const, label: 'Ngân hàng', icon: CreditCard },
          { key: 'security' as const, label: 'Bảo mật', icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
                active
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: THÔNG TIN */}
      {activeTab === 'info' && (
        <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-slate-100">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-teal-100 border-2 border-white shadow-xs text-teal-800 font-bold flex items-center justify-center text-2xl overflow-hidden">
                {user?.hinhDaiDien || user?.avatarUrl ? (
                  <img
                    src={user.hinhDaiDien || user.avatarUrl}
                    alt={user.hoVaTen || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.hoVaTen || user?.tenDangNhap || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-xs cursor-pointer transition-colors">
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {user?.hoVaTen || user?.tenDangNhap}
                </h2>
                {user?.chuTro ? (
                  <StatusBadge label="Chủ trọ đã xác thực" tone="success" />
                ) : (
                  <StatusBadge
                    label={user?.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách thuê'}
                    tone="info"
                  />
                )}
              </div>

              <p className="text-xs text-slate-600">
                Mã định danh:{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">
                  {user?.maNguoiDung}
                </code>
                <span className="mx-2">·</span>
                Ngày tham gia: {formatDate(user?.thoiGianMoTaiKhoan)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Họ và tên
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={hoVaTen}
                  onChange={(e) => setHoVaTen(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  maxLength={12}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Căn cước công dân (CCCD)
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled
                  value={user?.cccd || 'Chưa cập nhật'}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-600"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <AppButton
                type="submit"
                variant="primary"
                size="md"
                isLoading={updateProfileMutation.isPending}
              >
                Lưu thay đổi
              </AppButton>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: NGÂN HÀNG */}
      {activeTab === 'bank' && (
        <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tài khoản ngân hàng liên kết</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Dùng để nhận hoàn tiền hoặc rút số dư ví về tài khoản cá nhân
              </p>
            </div>
            <AppButton variant="primary" size="md" onClick={() => setShowBankModal(true)}>
              <Plus className="w-4 h-4" />
              <span>Thêm tài khoản</span>
            </AppButton>
          </div>

          {banksError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Không thể tải danh sách tài khoản ngân hàng</span>
              </div>
              <AppButton variant="secondary" size="sm" onClick={() => void refetchBanks()}>
                Thử lại
              </AppButton>
            </div>
          ) : isLoadingBanks ? (
            <SkeletonList variant="rows" count={2} />
          ) : bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((b, idx) => {
                const logoUrl = getBankLogo(b.tenNganHang);
                return (
                  <div
                    key={b.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={b.tenNganHang}
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
                        <p className="text-sm text-slate-700 font-mono tracking-wider">
                          {b.soTaiKhoan}
                        </p>
                        {b.tenChuTaiKhoan && (
                          <p className="text-xs text-slate-600 uppercase">{b.tenChuTaiKhoan}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge label="Đã liên kết" tone="success" />
                      {b.id && (
                        <button
                          type="button"
                          onClick={() => deleteBankMutation.mutate(b.id!)}
                          className="p-2 text-slate-500 hover:text-red-700 rounded-xl hover:bg-red-50 cursor-pointer"
                          title="Hủy liên kết"
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
                <AppButton variant="primary" size="md" onClick={() => setShowBankModal(true)}>
                  Liên kết ngân hàng ngay
                </AppButton>
              }
            />
          )}
        </Card>
      )}

      {/* TAB 3: BẢO MẬT */}
      {activeTab === 'security' && (
        <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Đổi mật khẩu</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Mật khẩu mới cần tối thiểu 8 ký tự để bảo vệ tài khoản của bạn
            </p>
          </div>

          <form onSubmit={handleSubmitPwd(onSubmitChangePassword)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                {...registerPwd('matKhauCu')}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
              />
              {pwdErrors.matKhauCu && (
                <p className="text-xs text-red-700 mt-1">{pwdErrors.matKhauCu.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                {...registerPwd('matKhauMoi')}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
              />
              {pwdErrors.matKhauMoi && (
                <p className="text-xs text-red-700 mt-1">{pwdErrors.matKhauMoi.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                {...registerPwd('xacNhanMatKhauMoi')}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
              />
              {pwdErrors.xacNhanMatKhauMoi && (
                <p className="text-xs text-red-700 mt-1">
                  {pwdErrors.xacNhanMatKhauMoi.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <AppButton type="submit" variant="primary" size="md" isLoading={isSubmittingPwd}>
                Cập nhật mật khẩu
              </AppButton>
            </div>
          </form>
        </Card>
      )}

      {/* BANNER MỜI GỌI NÂNG CẤP CHỦ TRỌ Ở CUỐI TRANG */}
      {!user?.chuTro && (
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Bạn có phòng trọ cần cho thuê?
                </h3>
                {requestStatus === 'CHO_DUYET' && (
                  <StatusBadge label="Hồ sơ đang chờ duyệt" tone="warning" />
                )}
                {requestStatus === 'TU_CHOI' && (
                  <StatusBadge label="Hồ sơ bị từ chối" tone="danger" />
                )}
              </div>
              <p className="text-sm text-slate-700">
                Xác thực CCCD 12 số và tài khoản ngân hàng để mở Cổng Chủ trọ và đăng tin ngay trên InnFinder.
              </p>
            </div>
          </div>

          {requestStatus !== 'CHO_DUYET' && (
            <AppButton
              variant="primary"
              size="md"
              onClick={() => setShowUpgradeModal(true)}
              className="shrink-0"
            >
              <span>Nâng cấp lên Chủ trọ</span>
              <ArrowRight className="w-4 h-4" />
            </AppButton>
          )}
        </div>
      )}

      {user?.chuTro && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex items-center gap-3 text-sm text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>
            Tài khoản của bạn đã kích hoạt vai trò <strong>Chủ trọ</strong>. Bạn có thể chuyển sang Cổng Chủ trọ từ menu avatar ở thanh điều hướng trên cùng.
          </span>
        </div>
      )}

      {/* MODAL THÊM NGÂN HÀNG */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Liên kết ngân hàng mới</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Số tài khoản gồm từ 6 đến 20 chữ số
              </p>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3">
              <BankSelect
                label="Ngân hàng"
                required
                value={newBankName}
                onChange={(shortName) => setNewBankName(shortName)}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tài khoản
                </label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Nhập 6–20 chữ số"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chủ tài khoản (In hoa)
                </label>
                <input
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={newAccountHolder}
                  onChange={(e) => setNewAccountHolder(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm uppercase text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <AppButton
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={() => setShowBankModal(false)}
                >
                  Hủy
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={addBankMutation.isPending}
                >
                  Liên kết
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NÂNG CẤP CHỦ TRỌ */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Đăng ký nâng cấp vai trò Chủ trọ
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Cung cấp CCCD 12 số, ảnh 2 mặt và tài khoản ngân hàng nhận thanh toán
              </p>
            </div>

            <form onSubmit={handleUpgradeToLandlord} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số CCCD (12 chữ số) *
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="VD: 079203001234"
                  value={upgradeCccd}
                  onChange={(e) => setUpgradeCccd(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ảnh mặt trước CCCD *
                  </label>
                  <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-2 hover:border-teal-500 transition-colors">
                    {upgradeFrontUrl ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã tải lên
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">Tải ảnh mặt trước</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await uploadService.uploadImage(f, 'cccd');
                          setUpgradeFrontUrl(url);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ảnh mặt sau CCCD *
                  </label>
                  <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 text-center p-2 hover:border-teal-500 transition-colors">
                    {upgradeBackUrl ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã tải lên
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">Tải ảnh mặt sau</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await uploadService.uploadImage(f, 'cccd');
                          setUpgradeBackUrl(url);
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số tài khoản (6–20 số) *
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Số tài khoản"
                    value={upgradeAccNum}
                    onChange={(e) => setUpgradeAccNum(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ tài khoản *
                  </label>
                  <input
                    type="text"
                    placeholder="Tên in hoa"
                    value={upgradeAccHolder}
                    onChange={(e) => setUpgradeAccHolder(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm uppercase text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <AppButton variant="secondary" size="md" fullWidth onClick={closeUpgradeModal}>
                  Hủy
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={upgradeMutation.isPending}
                >
                  Nộp hồ sơ
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
