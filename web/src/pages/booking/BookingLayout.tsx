import { NavLink, Outlet } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  PlusCircle,
  Home,
  Heart,
  Bell,
  User,
  AlertTriangle,
  Building2,
  ChevronRight,
} from "lucide-react";

export const BookingLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* 1. SIDEBAR BÊN TRÁI (Khớp 100% Mockup Web Dashboard) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-screen z-20">
        <div>
          {/* Logo & Brand */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  InnFinder
                </span>
                <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md block w-fit mt-0.5">
                  Khách thuê
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5">
              Phân hệ của tôi
            </div>

            <NavLink
              to="/booking/appointments"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-800 font-bold shadow-2xs border border-teal-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Lịch xem & Thuê phòng</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-teal-600/70" />
            </NavLink>

            <NavLink
              to="/booking/transactions"
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-800 font-bold shadow-2xs border border-teal-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Giao dịch & Cọc</span>
              </div>
            </NavLink>

            <div className="pt-4 pb-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1">
                Các trang chung (Nhóm ghép sau)
              </div>
            </div>

            <div className="opacity-45 space-y-1">
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-slate-500 cursor-not-allowed">
                <Home className="w-4 h-4" />
                <span>Trang chủ</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-slate-500 cursor-not-allowed">
                <Heart className="w-4 h-4" />
                <span>Phòng yêu thích</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-slate-500 cursor-not-allowed">
                <Bell className="w-4 h-4" />
                <span>Thông báo</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-slate-500 cursor-not-allowed">
                <User className="w-4 h-4" />
                <span>Thông tin cá nhân</span>
              </div>
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-slate-500 cursor-not-allowed">
                <AlertTriangle className="w-4 h-4" />
                <span>Khiếu nại</span>
              </div>
            </div>
          </nav>
        </div>

        {/* User Card ở chân Sidebar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                NA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">Nguyễn Văn An</p>
                <p className="text-[11px] text-slate-500 truncate">Khách hàng</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Docker MariaDB :3307 Online"></span>
          </div>
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH (CONTENT AREA) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header cho Mobile/Tablet hoặc Tooling bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">InnFinder</span>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">Khách thuê</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Docker MariaDB :3307 (Local Mode)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/booking/schedule?roomId=PT0111260001"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Đặt lịch thử nghiệm
            </NavLink>
          </div>
        </header>

        {/* Main Content Router Outlet */}
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BookingLayout;
