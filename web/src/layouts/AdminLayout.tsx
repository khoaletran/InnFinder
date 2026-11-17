import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck2,
  ArrowLeftRight,
  Star,
  AlertOctagon,
  FolderTree,
  BarChart3,
  LogOut,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Người dùng', path: '/admin/users', icon: Users },
    { label: 'Bài đăng', path: '/admin/posts', icon: Building2 },
    { label: 'Lịch xem', path: '/admin/viewings', icon: CalendarCheck2 },
    { label: 'Giao dịch', path: '/admin/transactions', icon: ArrowLeftRight },
    { label: 'Đánh giá', path: '/admin/reviews', icon: Star },
    { label: 'Khiếu nại', path: '/admin/complaints', icon: AlertOctagon },
    { label: 'Danh mục', path: '/admin/categories', icon: FolderTree },
    { label: 'Thống kê', path: '/admin/statistics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30 shadow-xl">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20">
                IF
              </div>
              <div>
                <span className="font-bold text-base text-white tracking-wide block leading-none">
                  InnFinder
                </span>
                <span className="text-[10px] tracking-wider text-blue-400 font-semibold uppercase">
                  ADMIN CONSOLE
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quản trị vận hành
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Admin User Info & Switcher */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            to="/customer/profile"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              Xem Cổng Khách hàng
            </span>
            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">
              User
            </span>
          </Link>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 font-bold flex items-center justify-center shrink-0 text-xs overflow-hidden">
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
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-400/30 uppercase">
                  Super Admin
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi Admin"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
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
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nhanh người dùng, bài đăng, mã cọc..."
                className="w-72 sm:w-80 pl-9 pr-4 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Hệ thống hoạt động ổn định
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div className="text-xs text-slate-600 font-medium">
              Chào buổi sáng, <strong className="text-slate-900">{user?.hoVaTen || 'Admin'}</strong>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
