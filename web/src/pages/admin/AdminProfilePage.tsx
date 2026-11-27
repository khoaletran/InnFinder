import React, { Suspense, useMemo, useRef, useState } from 'react';
import { Card } from '@heroui/react';
import {
  Camera,
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { ProfileErrorBoundary } from '@/components/profile/ProfileErrorBoundary';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { authUserService } from '@/services/authUser.service';
import { uploadService } from '@/services/upload.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate } from '@/utils/formatters';
import { validateAvatarFile } from '@/utils/security';

const AdminProfileTabSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Đang tải nội dung hồ sơ quản trị"
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

export const AdminProfilePage: React.FC = () => {
  const location = useLocation();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const tabMeta = useMemo(() => {
    if (location.pathname.endsWith('/security')) {
      return {
        title: 'Bảo mật – Hồ sơ Quản trị viên | InnFinder',
        description: 'Đổi mật khẩu và bảo vệ tài khoản Quản trị viên trên hệ thống InnFinder.',
        canonicalPath: '/admin/profile/security',
      };
    }
    return {
      title: 'Hồ sơ Quản trị viên | InnFinder',
      description: 'Quản lý thông tin tài khoản Quản trị viên trên hệ thống InnFinder.',
      canonicalPath: '/admin/profile',
    };
  }, [location.pathname]);

  useDocumentMeta({
    title: tabMeta.title,
    description: tabMeta.description,
    canonicalPath: tabMeta.canonicalPath,
    noIndex: true,
  });

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

  const displayName = user?.hoVaTen || user?.tenDangNhap || 'Quản trị viên';
  const avatarSrc = user?.hinhDaiDien || user?.avatarUrl;

  const navTabs = [
    { to: '/admin/profile', label: 'Thông tin tài khoản', icon: User, end: true },
    { to: '/admin/profile/security', label: 'Bảo mật & Mật khẩu', icon: KeyRound, end: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card (phẳng, Teal/Slate) */}
      <Card className="bg-surface rounded-xl border border-border p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-surface-muted border border-border text-text font-semibold flex items-center justify-center text-2xl overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`Ảnh đại diện của ${displayName}`}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover"
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
              className="absolute -bottom-1 -right-1 min-h-[38px] min-w-[38px] p-2 bg-accent hover:bg-accent-hover text-white rounded-full cursor-pointer transition-colors flex items-center justify-center focus:outline-none disabled:opacity-60"
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
              <h2 className="text-lg font-semibold text-text truncate">{displayName}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-accent-soft text-accent border border-accent-border text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Quản trị viên
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-text-muted">
              <span>Mã định danh:</span>
              <span className="inline-flex items-center gap-1 bg-surface-subtle border border-border pl-2.5 pr-1 py-0.5 rounded-lg">
                <span className="font-mono font-medium text-text">{user?.maNguoiDung}</span>
                <button
                  type="button"
                  onClick={() => void handleCopyUserId()}
                  aria-label="Sao chép mã định danh"
                  className="min-h-[28px] min-w-[28px] inline-flex items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-success-text" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
              <span aria-hidden="true" className="text-border-strong">
                •
              </span>
              <span>Ngày tham gia: {formatDate(user?.thoiGianMoTaiKhoan)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* URL-backed Navigation Tabs */}
      <nav
        aria-label="Danh mục hồ sơ quản trị"
        className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto no-scrollbar"
      >
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 min-h-[42px] px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors shrink-0 focus:outline-none ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-surface text-text-secondary border border-border hover:bg-surface-subtle'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <ProfileErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<AdminProfileTabSkeleton />}>
          <Outlet />
        </Suspense>
      </ProfileErrorBoundary>

      <AvatarCropModal
        file={cropFile}
        isUploading={isUploadingAvatar}
        onClose={() => setCropFile(null)}
        onConfirm={(croppedFile) => void handleConfirmAvatarCrop(croppedFile)}
      />
    </div>
  );
};
