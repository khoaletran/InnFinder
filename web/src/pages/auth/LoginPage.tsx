import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { loginSchema } from '../../utils/validators';
import { authUserService } from '../../services/authUser.service';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';

type LoginFormData = {
  tenDangNhap: string;
  matKhau: string;
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      tenDangNhap: '',
      matKhau: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const res = await authUserService.login(data);
      
      // Lấy thông tin chi tiết hồ sơ
      const profile = await authUserService.getMyProfile();
      setAuth(res.token, profile);

      toast.success(`Chào mừng trở lại, ${profile.hoVaTen || profile.tenDangNhap}!`);

      // Điều hướng theo phân quyền
      if (profile.vaiTro === 'QUAN_TRI') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/customer/profile';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập tài khoản</h2>
        <p className="text-xs text-slate-500 mt-1.5">
          Nhập thông tin xác thực để truy cập nền tảng quản lý phòng trọ InnFinder
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tên đăng nhập */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tên đăng nhập hoặc Email
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="VD: nguyenvana hoặc email@gmail.com"
              {...register('tenDangNhap')}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 transition-all ${
                errors.tenDangNhap
                  ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
              }`}
            />
          </div>
          {errors.tenDangNhap && (
            <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.tenDangNhap.message}</p>
          )}
        </div>

        {/* Mật khẩu */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">Mật khẩu</label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
              {...register('matKhau')}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 transition-all ${
                errors.matKhau
                  ? 'border-red-300 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:ring-blue-100 focus:border-blue-500 bg-slate-50/50'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.matKhau && (
            <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.matKhau.message}</p>
          )}
        </div>

        {/* Ghi nhớ đăng nhập */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 select-none">
            Ghi nhớ trạng thái đăng nhập trên thiết bị này
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang xác thực...
            </>
          ) : (
            <>
              Đăng nhập ngay
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium">hoặc đăng nhập bằng</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => toast.info('Đang kết nối xác thực Google OAuth2...')}
          className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-colors shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Đăng nhập với Google
        </button>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 pt-4">
          Chưa có tài khoản trên InnFinder?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </form>
    </div>
  );
};
