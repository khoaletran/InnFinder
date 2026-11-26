import React, { useId, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@heroui/react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { AppButton } from '@/components/common/AppButton';
import { authUserService } from '@/services/authUser.service';
import { changePasswordSchema } from '@/utils/validators';

interface ChangePasswordFormValues {
  matKhauCu: string;
  matKhauMoi: string;
  xacNhanMatKhauMoi: string;
}

function evaluatePasswordStrength(password: string): {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
} {
  if (!password) {
    return { score: 0, label: '', barClass: 'bg-slate-200', textClass: 'text-slate-500' };
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 10) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Yếu', barClass: 'bg-red-500', textClass: 'text-red-700' };
  }
  if (score === 2) {
    return { score: 2, label: 'Trung bình', barClass: 'bg-amber-500', textClass: 'text-amber-700' };
  }
  if (score === 3) {
    return { score: 3, label: 'Khá', barClass: 'bg-teal-500', textClass: 'text-teal-700' };
  }
  return { score: 4, label: 'Mạnh', barClass: 'bg-emerald-600', textClass: 'text-emerald-700' };
}

const ProfileSecurityTab: React.FC = () => {
  const sectionHeadingId = useId();
  const currentPwdId = useId();
  const newPwdId = useId();
  const confirmPwdId = useId();

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
    defaultValues: {
      matKhauCu: '',
      matKhauMoi: '',
      xacNhanMatKhauMoi: '',
    },
  });

  const watchedNewPwd = useWatch({ control, name: 'matKhauMoi' }) ?? '';
  const watchedConfirmPwd = useWatch({ control, name: 'xacNhanMatKhauMoi' }) ?? '';

  const strength = useMemo(() => evaluatePasswordStrength(watchedNewPwd), [watchedNewPwd]);

  const checklist = useMemo(
    () => [
      { label: 'Ít nhất 8 ký tự', met: watchedNewPwd.length >= 8 },
      { label: 'Có chữ hoa và chữ thường', met: /[A-Z]/.test(watchedNewPwd) && /[a-z]/.test(watchedNewPwd) },
      { label: 'Có ít nhất 1 chữ số', met: /\d/.test(watchedNewPwd) },
      {
        label: 'Mật khẩu xác nhận trùng khớp',
        met: watchedConfirmPwd.length > 0 && watchedNewPwd === watchedConfirmPwd,
      },
    ],
    [watchedNewPwd, watchedConfirmPwd],
  );

  const onSubmitChangePassword = async (data: ChangePasswordFormValues) => {
    try {
      await authUserService.changePassword(data);
      setLiveStatus('Đổi mật khẩu thành công.');
      toast.success('Đổi mật khẩu thành công!');
      reset();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
      setLiveStatus(msg);
      toast.error(msg);
    }
  };

  return (
    <section aria-labelledby={sectionHeadingId}>
      <div role="status" aria-live="polite" className="sr-only">
        {liveStatus}
      </div>

      <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div>
          <h2 id={sectionHeadingId} className="text-base font-bold text-slate-900">
            Đổi mật khẩu
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Mật khẩu mới cần tối thiểu 8 ký tự để bảo vệ tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmitChangePassword)} noValidate className="space-y-4 max-w-md">
          <div>
            <label
              htmlFor={currentPwdId}
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Mật khẩu hiện tại
            </label>
            <div className="relative flex items-center">
              <input
                id={currentPwdId}
                type={showCurrentPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu hiện tại"
                aria-invalid={Boolean(errors.matKhauCu)}
                aria-describedby={errors.matKhauCu ? `${currentPwdId}-error` : undefined}
                {...register('matKhauCu')}
                className={`w-full h-11 pl-3.5 pr-12 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.matKhauCu
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPwd((prev) => !prev)}
                aria-pressed={showCurrentPwd}
                aria-label={showCurrentPwd ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
                className="absolute right-1 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.matKhauCu && (
              <p id={`${currentPwdId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.matKhauCu.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={newPwdId}
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Mật khẩu mới
            </label>
            <div className="relative flex items-center">
              <input
                id={newPwdId}
                type={showNewPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                aria-invalid={Boolean(errors.matKhauMoi)}
                aria-describedby={`${newPwdId}-checklist${
                  errors.matKhauMoi ? ` ${newPwdId}-error` : ''
                }`}
                {...register('matKhauMoi')}
                className={`w-full h-11 pl-3.5 pr-12 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.matKhauMoi
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPwd((prev) => !prev)}
                aria-pressed={showNewPwd}
                aria-label={showNewPwd ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                className="absolute right-1 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.matKhauMoi && (
              <p id={`${newPwdId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.matKhauMoi.message}
              </p>
            )}

            {/* Thanh đo độ mạnh & checklist */}
            <div id={`${newPwdId}-checklist`} className="mt-2.5 space-y-2">
              {watchedNewPwd.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Độ mạnh mật khẩu:</span>
                    <span className={`font-bold ${strength.textClass}`}>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 rounded-full transition-colors ${
                          strength.score >= level ? strength.barClass : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <ul className="space-y-1 text-xs">
                {checklist.map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-1.5 ${
                      item.met ? 'text-emerald-700 font-medium' : 'text-slate-600'
                    }`}
                  >
                    {item.met ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <label
              htmlFor={confirmPwdId}
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Xác nhận mật khẩu mới
            </label>
            <div className="relative flex items-center">
              <input
                id={confirmPwdId}
                type={showConfirmPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                aria-invalid={Boolean(errors.xacNhanMatKhauMoi)}
                aria-describedby={errors.xacNhanMatKhauMoi ? `${confirmPwdId}-error` : undefined}
                {...register('xacNhanMatKhauMoi')}
                className={`w-full h-11 pl-3.5 pr-12 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                  errors.xacNhanMatKhauMoi
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPwd((prev) => !prev)}
                aria-pressed={showConfirmPwd}
                aria-label={showConfirmPwd ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                className="absolute right-1 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.xacNhanMatKhauMoi && (
              <p id={`${confirmPwdId}-error`} role="alert" className="text-xs text-red-700 mt-1">
                {errors.xacNhanMatKhauMoi.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="min-h-[44px]"
            >
              Cập nhật mật khẩu
            </AppButton>
          </div>
        </form>
      </Card>
    </section>
  );
};

export default ProfileSecurityTab;
