import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  PlusCircle,
  Wallet,
  MessageSquareQuote,
  ShieldCheck,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'sonner';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất thành công');
    navigate('/login', { replace: true });
  };

  const navItems = [
    { to: '/landlord', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/landlord/rooms', label: 'Quản lý phòng trọ', icon: Home },
    { to: '/landlord/appointments', label: 'Lịch hẹn xem phòng', icon: CalendarCheck },
    { to: '/landlord/rooms/create', label: 'Đăng phòng mới', icon: PlusCircle },
    { to: '/landlord/wallet', label: 'Ví & Giao dịch', icon: Wallet },
    { to: '/landlord/reviews', label: 'Đánh giá & Khiếu nại', icon: MessageSquareQuote },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-30 select-none shadow-xs">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-700 to-teal-600 bg-clip-text text-transparent">
            InnFinder
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-teal-600 -mt-1">
            Chủ Trọ Portal
          </span>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Quản Lý
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-cyan-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Landlord profile footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <img
            src={user?.hinhDaiDien || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt="Landlord Avatar"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/20"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user?.hoVaTen || user?.tenDangNhap || 'Trần Văn Khải'}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-teal-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Chủ phòng uy tín</span>
            </div>
          </div>
          <button
            title="Đăng xuất"
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
