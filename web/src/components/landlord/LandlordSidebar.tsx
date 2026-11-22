import React from 'react';
import { ArrowLeftRight, LogOut, Shield } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';
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
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <Link to="/" className="flex flex-col">
          <InnFinderLogo variant="horizontal" size="sm" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 pl-10 -mt-1">
            Kênh Chủ trọ
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
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
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          Chuyển sang Cổng Khách thuê
        </Link>

        {isAdmin && (
          <Link
            to="/admin/dashboard"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            Trang Quản trị
          </Link>
        )}

        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <Link
            to="/landlord/profile"
            title="Xem hồ sơ cá nhân"
            className="flex items-center gap-3 flex-1 min-w-0 group hover:opacity-85 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center overflow-hidden shrink-0 text-xs">
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
              <p className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                {user?.hoVaTen || user?.tenDangNhap || 'Chủ trọ'}
              </p>
            </div>
          </Link>
          <button
            type="button"
            title="Đăng xuất"
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
