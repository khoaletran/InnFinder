import React from 'react';
import { ArrowLeftRight, Building2, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LANDLORD_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export const LandlordSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất thành công');
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-30 select-none shadow-2xs shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <Link to="/" className="flex items-center gap-3">
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
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Quản Lý
        </div>
        {LANDLORD_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-50 text-cyan-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
        <Link
          to="/profile"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Chuyển sang Cổng Khách thuê
        </Link>

        {isAdmin && (
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            Vào Admin Console
          </Link>
        )}

        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center overflow-hidden shrink-0 text-xs">
            {user?.hinhDaiDien || user?.avatarUrl ? (
              <img
                src={user.hinhDaiDien || user.avatarUrl}
                alt={user.hoVaTen || user.tenDangNhap}
                className="w-full h-full object-cover"
              />
            ) : (
              (user?.hoVaTen || user?.tenDangNhap || 'CT').charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">
              {user?.hoVaTen || user?.tenDangNhap || 'Chủ trọ'}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-teal-600 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>Đã xác thực CCCD</span>
            </div>
          </div>
          <button
            type="button"
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
