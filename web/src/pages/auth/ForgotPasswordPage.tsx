import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Spinner } from '@heroui/react';
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { REGEX_PATTERNS } from '@/utils/validators';

export const ForgotPasswordPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
      setIsSuccess(true);
      toast.success('Liên kết khôi phục đã được gửi tới tài khoản của bạn!');
    }, 900);
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent p-0">
      {!isSuccess ? (
        <>
          <Card.Header className="px-0 pt-0 pb-5">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại Đăng nhập
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <Card.Title className="text-2xl font-bold text-slate-900 tracking-tight">
              Khôi phục mật khẩu
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-1">
              Nhập email hoặc số điện thoại liên kết với tài khoản để nhận mã OTP hoặc đường dẫn thiết lập mật khẩu mới.
            </Card.Description>
          </Card.Header>

          <Card.Content className="px-0 py-0">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" color="current" />
                    <span>Đang kiểm tra tài khoản...</span>
                  </>
                ) : (
                  <span>Gửi hướng dẫn khôi phục</span>
                )}
              </button>
            </form>
          </Card.Content>
        </>
      ) : (
        <Card.Content className="text-center py-6 px-0">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Đã gửi liên kết khôi phục!</h3>
          <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
            Hệ thống đã gửi hướng dẫn xác thực tới <strong>{identifier}</strong>. Vui lòng kiểm tra hộp thư đến (hoặc tin nhắn OTP) và làm theo hướng dẫn để đặt lại mật khẩu.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Quay về trang Đăng nhập
          </Link>
        </Card.Content>
      )}
    </Card>
  );
};
