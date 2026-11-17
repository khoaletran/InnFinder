import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, Headphones, Lock, CheckCircle2, Home, ArrowLeft } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InnFinder
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Hệ thống phòng trọ chuẩn
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-medium hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về trang chủ
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs">
            Hỗ trợ: <strong className="text-blue-600 font-semibold">1900 6868</strong>
          </span>
        </div>
      </header>

      {/* Main Content Area: 2 Columns */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          {/* Left Column: Hero Brand Panel */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-200 font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Nền tảng kiểm duyệt phòng trọ 2026
              </div>

              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug mb-4">
                Tìm đúng phòng. <br />
                <span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">
                  Quản lý nhẹ nhàng.
                </span> <br />
                Dữ liệu rõ ràng.
              </h1>

              <p className="text-slate-300 text-sm leading-relaxed mb-8">
                Hệ sinh thái kết nối Khách thuê và Chủ trọ minh bạch, bảo vệ quyền lợi đôi bên bằng quy trình cọc giữ chân và thu phí hoa hồng chuẩn xác.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Tin đăng đã xác thực</h4>
                    <p className="text-xs text-slate-300">Admin kiểm duyệt thực tế hình ảnh, tiện ích và vị trí GPS.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Bảo vệ cọc giữ chân xem phòng</h4>
                    <p className="text-xs text-slate-300">Hoàn cọc 100% khi xem phòng, sàn chỉ thu hoa hồng khi hai bên xác nhận thuê.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Bảo mật thông tin CCCD & Ngân hàng</h4>
                    <p className="text-xs text-slate-300">Hệ thống mã hóa chuẩn ngân hàng và quản lý ví minh bạch.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Hỗ trợ & Xử lý khiếu nại</h4>
                    <p className="text-xs text-slate-300">Ban quản trị can thiệp và xử lý minh chứng trong vòng 24 giờ.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>© 2026 InnFinder Platform</span>
              <span>Phiên bản v2.1.0</span>
            </div>
          </div>

          {/* Right Column: Form Outlet */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex items-center justify-center bg-white">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
