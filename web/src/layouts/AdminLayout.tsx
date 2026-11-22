import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, Home, UserCircle } from 'lucide-react';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { RouteLoadingOverlay } from '@/components/common/RouteLoadingOverlay';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isProfileRoute = location.pathname.startsWith('/admin/profile');
  const currentNav =
    ADMIN_NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.path : location.pathname.startsWith(item.path),
    ) || ADMIN_NAV_ITEMS[0];
  const HeaderIcon = isProfileRoute ? UserCircle : currentNav.icon;
  const headerTitle = isProfileRoute ? 'Hồ sơ Quản trị viên' : currentNav.label;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30 shadow-xl">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <InnFinderLogo variant="pin" size="sm" />
              <div>
                <span className="font-bold text-base text-white tracking-wide block leading-none">
                  InnFinder
                </span>
                <span className="text-[10px] tracking-wider text-teal-400 font-semibold uppercase">
                  Quản trị
                </span>
              </div>
            </Link>
          </div>

          {/* Centralized Navigation Links from @/constants/navigation */}
          <nav className="p-3 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-teal-600/25 text-white border border-teal-500/40 font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-teal-400 rounded-r-full" />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-300' : ''}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Portal Switchers & Admin User Info */}
        <div className="p-4 border-t border-slate-800 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Trang chủ</span>
            </Link>
            <NavLink
              to="/admin/profile"
              className={({ isActive }) =>
                `flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600/25 text-white border border-teal-500/40 font-semibold'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-transparent'
                }`
              }
            >
              <UserCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Hồ sơ Admin</span>
            </NavLink>
          </div>

          <div className="flex items-center justify-between pt-1.5">
            <Link
              to="/admin/profile"
              title="Xem hồ sơ Quản trị viên"
              className="flex items-center gap-2.5 overflow-hidden rounded-xl p-1 -ml-1 hover:bg-slate-800/70 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-400 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
                {user?.hinhDaiDien || user?.avatarUrl ? (
                  <img
                    src={user.hinhDaiDien || user.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  'AD'
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.hoVaTen || user?.tenDangNhap || 'Quản trị viên'}
                </p>
                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  Quản trị viên
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất khỏi Admin"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <HeaderIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 leading-tight">
              {headerTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <AdminNotificationBell />
            <div className="text-xs text-slate-600 font-medium">
              Xin chào, <strong className="text-slate-900">{user?.hoVaTen || user?.tenDangNhap || 'Admin'}</strong>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="relative flex-1 p-6 lg:p-8">
          <Outlet />
          <RouteLoadingOverlay />
        </main>
      </div>
    </div>
  );
};
