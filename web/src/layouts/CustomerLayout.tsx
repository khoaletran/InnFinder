import React from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  HelpCircle,
  Home,
  LogOut,
  Shield,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CUSTOMER_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';

export const CustomerLayout: React.FC = () => {
  const { user, logout, isAdmin, isChuTro } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất khỏi tài khoản');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        <div>
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  InnFinder
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                  Cổng Khách thuê
                </span>
              </div>
            </Link>
          </div>

          <nav className="p-3 space-y-1">
            {CUSTOMER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const showBadge = item.path === '/notifications' && unreadCount > 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 space-y-3">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Vào Admin Console
            </Link>
          )}

          {isChuTro ? (
            <Link
              to="/landlord/dashboard"
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between transition-colors"
            >
              <span className="font-semibold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Vào Cổng Chủ trọ
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
            </Link>
          ) : (
            <Link
              to="/profile?tab=upgrade"
              className="p-2.5 rounded-xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 text-teal-800 text-xs flex items-center justify-between transition-colors"
            >
              <span className="font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Đăng ký làm Chủ trọ
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-700" />
            </Link>
          )}

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white text-xs">
            <div className="flex items-center gap-2 text-blue-300 font-semibold mb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              Cần hỗ trợ gấp?
            </div>
            <p className="text-slate-300 text-[11px] mb-2 leading-relaxed">
              Giải đáp thắc mắc cọc xem phòng & khiếu nại 24/7.
            </p>
            <div className="text-sm font-bold text-amber-300">Hotline: 1900 6868</div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center shrink-0 text-sm overflow-hidden">
                {user?.hinhDaiDien || user?.avatarUrl ? (
                  <img
                    src={user.hinhDaiDien || user.avatarUrl}
                    alt={user.hoVaTen || user.tenDangNhap}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.hoVaTen || user?.tenDangNhap || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.hoVaTen || user?.tenDangNhap || 'Khách hàng'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.email || 'Chưa đăng nhập'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-slate-800">Cổng thông tin người dùng</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/notifications"
              className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <Link to="/profile" className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">
                {user?.hoVaTen || user?.tenDangNhap}
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs overflow-hidden">
                {user?.hinhDaiDien || user?.avatarUrl ? (
                  <img
                    src={user.hinhDaiDien || user.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.hoVaTen || user?.tenDangNhap || 'U').charAt(0).toUpperCase()
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
