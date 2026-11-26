import React, { Suspense, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
import {
  ArrowRight,
  Building,
  Camera,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Link, Navigate, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { PageContainer } from '@/components/common/PageContainer';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { ProfileErrorBoundary } from '@/components/profile/ProfileErrorBoundary';
import { UpgradeLandlordModal } from '@/components/profile/UpgradeLandlordModal';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/utils/formatters';
import { validateAvatarFile } from '@/utils/security';

const ProfileTabSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Đang tải nội dung mục hồ sơ"
    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 animate-pulse"
  >
    <div className="space-y-2 pb-4 border-b border-slate-100">
      <div className="h-5 w-48 bg-slate-200 rounded" />
      <div className="h-3.5 w-72 bg-slate-100 rounded" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="h-11 bg-slate-100 rounded-xl" />
      <div className="h-11 bg-slate-100 rounded-xl" />
      <div className="h-11 bg-slate-100 rounded-xl" />
      <div className="h-11 bg-slate-100 rounded-xl" />
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const metaConfig = useMemo(() => {
    if (location.pathname.startsWith('/profile/bank')) {
      return {
        title: 'Ngân hàng – Hồ sơ cá nhân | InnFinder',
        description: 'Quản lý tài khoản ngân hàng liên kết trên InnFinder.',
        noIndex: true,
        canonicalPath: '/profile/bank',
      };
    }
    if (location.pathname.startsWith('/profile/security')) {
      return {
        title: 'Bảo mật – Hồ sơ cá nhân | InnFinder',
        description: 'Cập nhật mật khẩu và bảo mật tài khoản InnFinder.',
        noIndex: true,
        canonicalPath: '/profile/security',
      };
    }
    return {
      title: 'Hồ sơ cá nhân | InnFinder',
      description: 'Quản lý thông tin tài khoản, ngân hàng nhận tiền và bảo mật trên InnFinder.',
      noIndex: true,
      canonicalPath: '/profile',
    };
  }, [location.pathname]);

  useDocumentMeta(metaConfig);

  const tabParam = searchParams.get('tab');

  const { data: landlordRequest } = useQuery({
    queryKey: ['users', 'my-landlord-request'],
    queryFn: authUserService.getMyLandlordRequest,
    enabled: !user?.chuTro,
  });

  if (tabParam === 'bank') {
    return <Navigate to="/profile/bank" replace />;
  }
  if (tabParam === 'security') {
    return <Navigate to="/profile/security" replace />;
  }

  const isUpgradeModalOpen =
    showUpgradeModal || (tabParam === 'upgrade' && !user?.chuTro);

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false);
    if (tabParam === 'upgrade') {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSelectAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = await validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setCropFile(file);
  };

  const handleConfirmAvatarCrop = async (croppedFile: File) => {
    try {
      setIsUploadingAvatar(true);
      const url = await uploadService.uploadImage(croppedFile, 'avatars');
      const updated = await authUserService.updateProfile({
        hoVaTen: user?.hoVaTen,
        hinhDaiDien: url,
        avatarUrl: url,
        email: user?.email || '',
        sdt: user?.sdt || '',
      });
      setUser(updated);
      setCropFile(null);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi cập nhật ảnh đại diện');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCopyUserId = async () => {
    if (!user?.maNguoiDung) return;
    try {
      await navigator.clipboard.writeText(user.maNguoiDung);
      setCopiedId(true);
      toast.success('Đã sao chép mã định danh!');
      window.setTimeout(() => setCopiedId(false), 2000);
    } catch {
      toast.error('Không thể sao chép vào bộ nhớ tạm');
    }
  };

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Thành viên';
  const avatarSrc = user?.hinhDaiDien || user?.avatarUrl;
  const requestStatus = landlordRequest?.trangThai as string | undefined;

  const navTabs = [
    { to: '/profile', label: 'Thông tin', icon: User, end: true },
    { to: '/profile/bank', label: 'Ngân hàng', icon: CreditCard, end: false },
    { to: '/profile/security', label: 'Bảo mật', icon: KeyRound, end: false },
  ];

  return (
    <PageContainer width="narrow" className="space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Đường dẫn" className="text-xs text-slate-600">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              to="/"
              className="hover:text-teal-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded px-1 py-0.5"
            >
              Trang chủ
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </li>
          <li>
            <span className="text-slate-500">Tài khoản</span>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </li>
          <li aria-current="page" className="font-semibold text-slate-900">
            Hồ sơ cá nhân
          </li>
        </ol>
      </nav>

      {/* Single H1 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Quản lý thông tin tài khoản, ngân hàng nhận tiền và bảo mật
        </p>
      </div>

      {/* Profile Header Card */}
      <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-teal-100 border-2 border-white shadow-xs text-teal-800 font-bold flex items-center justify-center text-2xl overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`Ảnh đại diện của ${displayName}`}
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover"
                />
              ) : (
                <span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Đổi ảnh đại diện"
              className="absolute -bottom-1 -right-1 min-h-[44px] min-w-[44px] p-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-sm cursor-pointer transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 disabled:opacity-60"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleSelectAvatarFile(e)}
              disabled={isUploadingAvatar}
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg font-bold text-slate-900 truncate">{displayName}</h2>
              {user?.chuTro ? (
                <StatusBadge label="Chủ trọ đã xác thực" tone="success" />
              ) : (
                <StatusBadge
                  label={user?.vaiTro === 'QUAN_TRI' ? 'Quản trị viên' : 'Khách thuê'}
                  tone="info"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-600">
              <span>Mã định danh:</span>
              <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 pl-2.5 pr-1 py-0.5 rounded-lg">
                <span className="font-mono font-semibold text-slate-800">{user?.maNguoiDung}</span>
                <button
                  type="button"
                  onClick={() => void handleCopyUserId()}
                  aria-label="Sao chép mã định danh"
                  className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-md text-slate-600 hover:text-teal-700 hover:bg-white transition-colors cursor-pointer"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                •
              </span>
              <span>Ngày tham gia: {formatDate(user?.thoiGianMoTaiKhoan)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* URL-backed Navigation Tabs */}
      <nav
        aria-label="Danh mục hồ sơ"
        className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto no-scrollbar"
      >
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Active Tab Content (Lazy-loaded Bank & Security tabs with Skeleton + ErrorBoundary) */}
      <ProfileErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<ProfileTabSkeleton />}>
          <Outlet />
        </Suspense>
      </ProfileErrorBoundary>

      {/* Landlord Portal CTA Card */}
      {!user?.chuTro ? (
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Bạn có phòng trọ cần cho thuê?
                </h2>
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
              className="shrink-0 min-h-[44px]"
            >
              <span>Nâng cấp lên Chủ trọ</span>
              <ArrowRight className="w-4 h-4" />
            </AppButton>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-emerald-950">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-emerald-950">Tài khoản Chủ trọ đã kích hoạt</h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                Quản lý bài đăng phòng trọ, lịch hẹn xem phòng và rút tiền ví tại Cổng Chủ trọ.
              </p>
            </div>
          </div>

          <Link
            to="/landlord/dashboard"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
          >
            <span>Chuyển sang Cổng Chủ trọ</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <AvatarCropModal
        file={cropFile}
        isUploading={isUploadingAvatar}
        onClose={() => setCropFile(null)}
        onConfirm={(croppedFile) => void handleConfirmAvatarCrop(croppedFile)}
      />

      <UpgradeLandlordModal isOpen={isUpgradeModalOpen} onClose={closeUpgradeModal} />
    </PageContainer>
  );
};
