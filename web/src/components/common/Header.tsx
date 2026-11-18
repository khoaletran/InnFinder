import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Heart,
  Home,
  LogIn,
  LogOut,
  PlusCircle,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { Chip } from '@heroui/react';
import { toast } from 'sonner';
import { PUBLIC_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isAdmin, isChuTro, logout } = useAuthStore();
  const favoriteIds = useFavoriteStore((s) => s.favoriteIds);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handlePostRoomClick = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để đăng tin phòng trọ');
      navigate('/login');
      return;
    }
    if (isChuTro) {
      navigate('/landlord/rooms/create');
    } else {
      toast.info('Vui lòng đăng ký nâng cấp vai trò Chủ trọ trước khi đăng tin');
      navigate('/profile?tab=upgrade');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất khỏi tài khoản');
    navigate('/');
  };

  const initials = (user?.hoVaTen || user?.tenDangNhap || 'KH')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* 1. Thương hiệu chuẩn InnFinder */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition-colors">
            <Home className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-teal-700 transition-colors">
              InnFinder
            </span>
            <span className="text-[10px] -mt-1 font-semibold text-teal-600 uppercase tracking-wider">
              Sàn Phòng Trọ Xác Thực
            </span>
          </div>
        </Link>

        {/* 2. Menu Điều hướng trung tâm */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isFav = item.path === '/favorites';
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                  active
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isFav && favoriteIds.length > 0 ? 'fill-rose-500 text-rose-500' : ''
                  }`}
                />
                <span>{item.label}</span>
                {isFav && favoriteIds.length > 0 && (
                  <Chip size="sm" color="danger" className="text-[10px] font-bold px-1.5 py-0">
                    {favoriteIds.length}
                  </Chip>
                )}
              </Link>
            );
          })}

          {isAuthenticated && (
            <Link
              to="/appointments"
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                isActive('/appointments')
                  ? 'bg-teal-50 text-teal-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Lịch hẹn</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handlePostRoomClick}
            className="px-4 py-2 rounded-full text-sm font-semibold text-teal-700 bg-teal-50/70 hover:bg-teal-100 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Đăng tin</span>
          </button>
        </nav>

        {/* 3. Hành động Xác thực & Chuyển Cổng */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/search"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            title="Tìm kiếm"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            to="/favorites"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative"
            title="Yêu thích"
          >
            <Heart
              className={`w-5 h-5 ${favoriteIds.length > 0 ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </Link>

          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-teal-700 px-3 py-2 transition-colors items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
              >
                Đăng ký
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Console
                </Link>
              )}

              {isChuTro && (
                <Link
                  to="/landlord/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Cổng Chủ trọ
                </Link>
              )}

              <Link
                to="/profile"
                title="Cổng cá nhân Khách thuê"
                className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                  {user?.hinhDaiDien || user?.avatarUrl ? (
                    <img
                      src={user.hinhDaiDien || user.avatarUrl}
                      alt={user.hoVaTen || user.tenDangNhap}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials || <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-800 max-w-[110px] truncate">
                  {user?.hoVaTen || user?.tenDangNhap}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
