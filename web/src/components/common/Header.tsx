import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  Headphones,
  Heart,
  LogIn,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';
import { CUSTOMER_NAV_ITEMS, PUBLIC_NAV_ITEMS } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useNotificationStore } from '@/store/useNotificationStore';

interface LocationStateWithLeftTab {
  openLeftTab?: boolean;
}

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isAdmin, isChuTro, logout } = useAuthStore();
  const favoriteIds = useFavoriteStore((s) => s.favoriteIds);
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);

  const [isLeftTabOpen, setIsLeftTabOpen] = useState(false);

  // Tự động mở LeftTab khi vừa đăng nhập thành công
  useEffect(() => {
    const state = location.state as LocationStateWithLeftTab | null;
    if (state?.openLeftTab) {
      setIsLeftTabOpen(true);
      // Xóa flag trong history state để không tự động mở lại khi reload
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
    setIsLeftTabOpen(false);
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
    <>
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xs border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* 1. Thương hiệu chuẩn InnFinder & Nút mở LeftTab khi đã đăng nhập */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setIsLeftTabOpen(true)}
                className="p-2 -ml-2 rounded-[var(--radius-control)] text-text-secondary hover:text-text hover:bg-surface-muted transition-colors flex items-center justify-center cursor-pointer"
                title="Mở menu chức năng (LeftTab)"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link to="/" className="flex items-center group">
              <InnFinderLogo
                variant="horizontal"
                size="sm"
                className="group-hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* 2. Menu Điều hướng trung tâm */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {PUBLIC_NAV_ITEMS.filter((item) => !(isChuTro && item.path === '/roommates')).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const isFav = item.path === '/favorites';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-3.5 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? 'text-text font-semibold'
                      : 'text-text-muted font-medium hover:text-text'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isFav && favoriteIds.length > 0 ? 'text-danger-text' : ''
                    }`}
                  />
                  <span>{item.label}</span>
                  {isFav && favoriteIds.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-[var(--radius-badge)] bg-surface-muted text-text-secondary text-[11px] font-medium tabular-nums leading-none">
                      {favoriteIds.length}
                    </span>
                  )}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-text rounded-full"
                    />
                  )}
                </Link>
              );
            })}

            {/* Chỉ khi ĐÃ ĐĂNG NHẬP mới hiển thị Lịch hẹn; chỉ CHỦ TRỌ mới được đăng tin */}
            {isAuthenticated && (
              <>
                <Link
                  to="/appointments"
                  className={`relative px-3.5 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isActive('/appointments')
                      ? 'text-text font-semibold'
                      : 'text-text-muted font-medium hover:text-text'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Lịch hẹn</span>
                  {isActive('/appointments') && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-text rounded-full"
                    />
                  )}
                </Link>

                {isChuTro && (
                  <button
                    type="button"
                    onClick={handlePostRoomClick}
                    className="px-3.5 py-1.5 rounded-[var(--radius-control)] text-sm font-medium text-accent bg-accent-soft hover:bg-surface-muted transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Đăng tin</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* 3. Hành động Xác thực & Mở LeftTab */}
          <div className="flex items-center gap-2.5">
            {!isChuTro && (
              <Link to="/roommates" aria-label="Ở ghép"
                className="rounded-[var(--radius-control)] p-2 text-text-muted hover:bg-surface-muted md:hidden">
                <Users className="h-5 w-5" aria-hidden />
              </Link>
            )}
            <Link
              to="/search"
              className="md:hidden p-2 rounded-[var(--radius-control)] text-text-muted hover:bg-surface-muted"
              title="Tìm kiếm"
            >
              <Search className="w-5 h-5" />
            </Link>
            <Link
              to="/favorites"
              className="md:hidden p-2 rounded-[var(--radius-control)] text-text-muted hover:bg-surface-muted relative"
              title="Yêu thích"
            >
              <Heart
                className={`w-5 h-5 ${favoriteIds.length > 0 ? 'text-danger-text' : ''}`}
              />
            </Link>

            {!isAuthenticated ? (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white font-medium text-sm px-4 py-2 rounded-[var(--radius-control)] transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-sidebar-bg text-white text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <Shield className="w-3.5 h-3.5 text-[var(--sidebar-active-icon)]" />
                    Admin Console
                  </Link>
                )}

                {isChuTro && (
                  <Link
                    to="/landlord/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-surface text-text-secondary border border-border text-xs font-medium hover:bg-bg transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-accent" />
                    Cổng Chủ trọ
                  </Link>
                )}

                {/* Nhấn avatar/tên sẽ mở LeftTab hiển thị đầy đủ chức năng */}
                <button
                  type="button"
                  onClick={() => setIsLeftTabOpen(true)}
                  title="Mở menu chức năng (LeftTab)"
                  className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-surface-muted hover:bg-border/60 border border-border transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold overflow-hidden">
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
                  <span className="hidden sm:inline text-xs font-medium text-text max-w-[110px] truncate">
                    {user?.hoVaTen || user?.tenDangNhap}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-[var(--radius-control)] text-text-muted hover:text-danger-text hover:bg-danger-bg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= 4. LEFTTAB DRAWER (MENU CHỨC NĂNG) ================= */}
      {isLeftTabOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop mờ phía sau */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsLeftTabOpen(false)}
          />

          {/* Bảng LeftTab trượt từ bên trái */}
          <aside className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-300 border-r border-slate-200">
            {/* Header của LeftTab */}
            <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
              <Link
                to="/"
                onClick={() => setIsLeftTabOpen(false)}
                className="flex items-center gap-2"
              >
                <InnFinderLogo variant="horizontal" size="sm" />
              </Link>
              <button
                type="button"
                onClick={() => setIsLeftTabOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung danh sách chức năng (cuộn dọc) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Thẻ thông tin tài khoản */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-sm overflow-hidden shadow-xs">
                  {user?.hinhDaiDien || user?.avatarUrl ? (
                    <img
                      src={user.hinhDaiDien || user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user?.hoVaTen || user?.tenDangNhap}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      {isAdmin ? 'Quản trị viên' : isChuTro ? 'Chủ trọ' : 'Khách thuê'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lối tắt Cổng Quản trị / Cổng Chủ trọ */}
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsLeftTabOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
                >
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Vào Admin Console</span>
                </Link>
              )}

              {isChuTro ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/landlord/dashboard"
                    onClick={() => setIsLeftTabOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors text-center"
                  >
                    <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>Cổng Chủ trọ</span>
                  </Link>
                  <Link
                    to="/landlord/rooms/create"
                    onClick={() => setIsLeftTabOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs text-center"
                  >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Đăng phòng</span>
                  </Link>
                </div>
              ) : (
                <Link
                  to="/profile?tab=upgrade"
                  onClick={() => setIsLeftTabOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-800 text-xs hover:bg-teal-100 transition-colors"
                >
                  <span className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    Đăng ký làm Chủ trọ
                  </span>
                  <ArrowRight className="w-4 h-4 text-teal-600" />
                </Link>
              )}

              {/* Danh sách các chức năng (CUSTOMER_NAV_ITEMS) */}
              <div className="space-y-1 pt-1">
                <div className="px-2 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Menu chức năng
                </div>
                {CUSTOMER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  const showBadge = item.path === '/notifications' && unreadNotifications > 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsLeftTabOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-teal-50 text-teal-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {showBadge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                          {unreadNotifications}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Hotline hỗ trợ */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-teal-950 text-white text-xs">
                <div className="flex items-center gap-2 text-teal-300 font-semibold mb-1">
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Tổng đài hỗ trợ 24/7</span>
                </div>
                <p className="text-slate-300 text-[11px] mb-2 leading-relaxed">
                  Giải đáp thắc mắc cọc xem phòng & xử lý khiếu nại.
                </p>
                <div className="text-sm font-bold text-amber-300">Hotline: 1900 6868</div>
              </div>
            </div>

            {/* Chân trang LeftTab: Đăng xuất */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
