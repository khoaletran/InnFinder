import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Spinner } from '@heroui/react';
import { Mail, ArrowLeft, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { REGEX_PATTERNS } from '@/utils/validators';

type Step = 'ENTER_EMAIL' | 'OTP_SENT' | 'DONE';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('ENTER_EMAIL');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập email hoặc số điện thoại đã đăng ký');
      return;
    }

    const isValidEmail = REGEX_PATTERNS.EMAIL.test(trimmed);
    const isValidPhone = REGEX_PATTERNS.PHONE.test(trimmed);
    if (!isValidEmail && !isValidPhone) {
      toast.error('Vui lòng nhập đúng định dạng Email hoặc Số điện thoại Việt Nam');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('OTP_SENT');
      toast.success('Đã gửi mã OTP 6 chữ số (chế độ mô phỏng cho tới khi mở API khôi phục)');
    }, 600);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('DONE');
      toast.success('Đặt lại mật khẩu thành công!');
    }, 600);
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent p-0">
      {step === 'ENTER_EMAIL' && (
        <>
          <Card.Header className="px-0 pt-0 pb-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại Đăng nhập
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <Card.Title className="text-2xl font-bold text-slate-900 tracking-tight">
              Khôi phục mật khẩu
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-1">
              Nhập email hoặc số điện thoại liên kết với tài khoản để nhận mã OTP thiết lập mật khẩu mới.
            </Card.Description>
          </Card.Header>

          <Card.Content className="px-0 py-0">
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email / Số điện thoại đăng ký
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="VD: user@domain.com hoặc 0912345678"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" color="current" />
                    <span>Đang gửi mã OTP...</span>
                  </>
                ) : (
                  <span>Nhận mã OTP</span>
                )}
              </button>
            </form>
          </Card.Content>
        </>
      )}

      {step === 'OTP_SENT' && (
        <>
          <Card.Header className="px-0 pt-0 pb-5">
            <button
              type="button"
              onClick={() => setStep('ENTER_EMAIL')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Đổi email / số điện thoại
            </button>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <Card.Title className="text-2xl font-bold text-slate-900 tracking-tight">
              Nhập mã xác thực OTP
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-1">
              Mã OTP 6 chữ số đã được gửi tới <strong>{identifier}</strong>. Vui lòng nhập mã và đặt mật khẩu mới.
            </Card.Description>
          </Card.Header>

          <Card.Content className="px-0 py-0">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mã OTP (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-center tracking-widest bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" color="current" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <span>Đổi mật khẩu</span>
                )}
              </button>
            </form>
          </Card.Content>
        </>
      )}

      {step === 'DONE' && (
        <Card.Content className="text-center py-6 px-0">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Khôi phục thành công!</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
            Mật khẩu cho tài khoản <strong>{identifier}</strong> đã được cập nhật. Bạn có thể đăng nhập lại ngay bây giờ.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </Card.Content>
      )}
    </Card>
  );
};
