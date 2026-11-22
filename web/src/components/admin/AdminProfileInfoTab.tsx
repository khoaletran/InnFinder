import React, { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@heroui/react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Phone, Shield, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useBlocker } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { authUserService } from '@/services/authUser.service';
import { useAuthStore } from '@/store/useAuthStore';
import { profileUpdateSchema } from '@/utils/validators';

interface AdminProfileFormValues {
  hoVaTen: string;
  email: string;
  sdt: string;
}

export const AdminProfileInfoTab: React.FC = () => {
  const { user, setUser } = useAuthStore();
  const sectionHeadingId = useId();
  const usernameId = useId();
  const fullNameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const [liveStatus, setLiveStatus] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<AdminProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onChange',
    defaultValues: {
      hoVaTen: user?.hoVaTen ?? '',
      email: user?.email ?? '',
      sdt: user?.sdt ?? '',
    },
  });

  useEffect(() => {
    reset({
      hoVaTen: user?.hoVaTen ?? '',
      email: user?.email ?? '',
      sdt: user?.sdt ?? '',
    });
  }, [user?.hoVaTen, user?.email, user?.sdt, reset]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const updateProfileMutation = useMutation({
    mutationFn: authUserService.updateProfile,
    onSuccess: (updated) => {
      setUser(updated);
      reset({
        hoVaTen: updated.hoVaTen ?? '',
        email: updated.email ?? '',
        sdt: updated.sdt ?? '',
      });
      setLiveStatus('Đã lưu thông tin hồ sơ quản trị thành công.');
      toast.success('Đã lưu thông tin hồ sơ quản trị thành công!');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật thông tin';
      setLiveStatus(msg);
      toast.error(msg);
    },
  });

  const onSubmit = (data: AdminProfileFormValues) => {
    updateProfileMutation.mutate({
      hoVaTen: data.hoVaTen.trim(),
      email: data.email.trim(),
      sdt: data.sdt.trim(),
      hinhDaiDien: user?.hinhDaiDien,
    });
  };

  return (
    <section aria-labelledby={sectionHeadingId}>
      <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 id={sectionHeadingId} className="text-base font-bold text-slate-900">
              Thông tin tài khoản Quản trị viên
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Cập nhật họ tên hiển thị, email và số điện thoại liên hệ nội bộ
            </p>
          </div>
          {isDirty && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold self-start sm:self-auto">
              Có thay đổi chưa lưu
            </span>
          )}
        </div>

        <div role="status" aria-live="polite" className="sr-only">
          {liveStatus}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={usernameId} className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên đăng nhập
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={usernameId}
                type="text"
                readOnly
                disabled
                value={user?.tenDangNhap ?? ''}
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm font-mono bg-slate-50 text-slate-700"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tên đăng nhập quản trị không thể thay đổi.
            </p>
          </div>

          <div>
            <label htmlFor={fullNameId} className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={fullNameId}
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.hoVaTen)}
                aria-describedby={errors.hoVaTen ? `${fullNameId}-error` : undefined}
                {...register('hoVaTen')}
                className={`w-full h-11 pl-10 pr-3 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.hoVaTen
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
            </div>
            {errors.hoVaTen && (
              <p id={`${fullNameId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.hoVaTen.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={emailId} className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? `${emailId}-error` : undefined}
                {...register('email')}
                className={`w-full h-11 pl-10 pr-3 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
            </div>
            {errors.email && (
              <p id={`${emailId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={phoneId} className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={phoneId}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={12}
                aria-invalid={Boolean(errors.sdt)}
                aria-describedby={errors.sdt ? `${phoneId}-error` : undefined}
                {...register('sdt')}
                className={`w-full h-11 pl-10 pr-3 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.sdt
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
            </div>
            {errors.sdt && (
              <p id={`${phoneId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.sdt.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              disabled={!isDirty || !isValid}
              isLoading={updateProfileMutation.isPending}
              className="min-h-[44px]"
            >
              Lưu thay đổi
            </AppButton>
          </div>
        </form>
      </Card>

      {blocker.state === 'blocked' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-admin-profile-title"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 id="unsaved-admin-profile-title" className="text-base font-bold text-slate-900">
              Thay đổi chưa được lưu
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đã chỉnh sửa thông tin hồ sơ nhưng chưa bấm lưu. Bạn muốn rời khỏi trang này?
            </p>
            <div className="flex gap-2 pt-1">
              <AppButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => blocker.reset?.()}
                className="min-h-[44px]"
              >
                Ở lại chỉnh sửa
              </AppButton>
              <AppButton
                variant="danger"
                size="md"
                fullWidth
                onClick={() => blocker.proceed?.()}
                className="min-h-[44px]"
              >
                Rời trang
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
