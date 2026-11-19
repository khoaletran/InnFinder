import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  PlusCircle,
  Receipt,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { Footer } from '@/components/common/Footer';
import { InnFinderLogo } from '@/components/common/InnFinderLogo';
import { NotificationModal } from '@/components/notification/NotificationModal';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isAdmin, isChuTro, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const favoriteIds = useFavoriteStore((s) => s.favoriteIds);
  const setKeyword = useRoomFilterStore((s) => s.setKeyword);

  const [navSearch, setNavSearch] = useState('');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && user?.maNguoiDung) {
      void fetchNotifications();
    }
  }, [isAuthenticated, user?.maNguoiDung, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsAvatarMenuOpen(false);
    logout();
    toast.success('Đã đăng xuất khỏi tài khoản');
    navigate('/');
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = navSearch.trim();
    setKeyword(trimmed);
    navigate(trimmed ? `/search?keyword=${encodeURIComponent(trimmed)}` : '/search');
  };

  const isHomePage = location.pathname === '/';
  const isSearchPage = location.pathname.startsWith('/search');
  const isDiscoveryRoute =
    isHomePage || isSearchPage || location.pathname.startsWith('/room/');
  const showHeaderSearch = !isHomePage && !isSearchPage;

  const initials = (user?.hoVaTen || user?.tenDangNhap || 'KH')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const mainNavLinks = [
    { label: 'Tìm phòng', path: '/search', icon: Search },
    { label: 'Yêu thích', path: '/favorites', icon: Heart },
    { label: 'Lịch xem phòng', path: '/appointments', icon: Calendar },
  ];

  return (
    <div
      className={`bg-slate-50 flex flex-col ${
        isSearchPage ? 'h-screen overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* TOP NAVBAR CỐ ĐỊNH */}
      <header className="h-16 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1200px] w-full h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Trái: Logo + Ô tìm kiếm gọn (ẩn ở Trang chủ & Tìm phòng) */}
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" className="shrink-0 flex items-center">
              <InnFinderLogo variant="horizontal" size="sm" />
            </Link>

            {showHeaderSearch && (
              <form
                onSubmit={handleQuickSearch}
                className="hidden md:flex items-center w-64 lg:w-72 relative"
              >
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Tìm khu vực, tên đường..."
                  className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-slate-200 focus:border-teal-600 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition-colors"
                />
              </form>
            )}
          </div>

          {/* Giữa: 3 mục điều hướng chính */}
          <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-2">
            {mainNavLinks.map((item) => {
              const Icon = item.icon;
              const isFav = item.path === '/favorites';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-teal-50 text-teal-800'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isFav && favoriteIds.length > 0 ? 'fill-red-500 text-red-500' : ''
                    }`}
                  />
                  <span>{item.label}</span>
                  {isFav && favoriteIds.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-bold leading-none">
                      {favoriteIds.length}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Phải: Thông báo + Avatar dropdown (hoặc Đăng nhập) */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsNotificationModalOpen((prev) => !prev)}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isNotificationModalOpen
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-teal-700 hover:bg-slate-100'
                    }`}
                    title="Thông báo"
                    aria-label="Xem thông báo"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
                    )}
                  </button>

                  <NotificationModal
                    isOpen={isNotificationModalOpen}
                    onClose={() => setIsNotificationModalOpen(false)}
                  />
                </div>

                <div className="relative" ref={avatarMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                    aria-expanded={isAvatarMenuOpen}
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {user?.hinhDaiDien || user?.avatarUrl ? (
                        <img
                          src={user.hinhDaiDien || user.avatarUrl}
                          alt={user.hoVaTen || user.tenDangNhap}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-semibold text-slate-800 max-w-[140px] truncate">
                      {user?.hoVaTen || user?.tenDangNhap}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>

                  {isAvatarMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {user?.hoVaTen || user?.tenDangNhap}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {user?.email || (isChuTro ? 'Chủ trọ đã xác thực' : 'Khách thuê')}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/transactions"
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Receipt className="w-4 h-4 text-slate-500" />
                          <span>Lịch sử giao dịch</span>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          <span>Hồ sơ</span>
                        </Link>
                        <Link
                          to="/complaints"
                          onClick={() => setIsAvatarMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <AlertTriangle className="w-4 h-4 text-slate-500" />
                          <span>Khiếu nại &amp; Hỗ trợ</span>
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 py-1">
                        {isChuTro ? (
                          <>
                            <Link
                              to="/landlord/dashboard"
                              onClick={() => setIsAvatarMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                            >
                              <Building2 className="w-4 h-4" />
                              <span>Cổng Chủ trọ</span>
                            </Link>
                            <Link
                              to="/landlord/rooms/create"
                              onClick={() => setIsAvatarMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                            >
                              <PlusCircle className="w-4 h-4" />
                              <span>Đăng phòng mới</span>
                            </Link>
                          </>
                        ) : (
                          <Link
                            to="/profile?tab=upgrade"
                            onClick={() => setIsAvatarMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Đăng ký làm Chủ trọ</span>
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setIsAvatarMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            <Shield className="w-4 h-4 text-teal-600" />
                            <span>Admin Console</span>
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-xs transition-colors whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* NỘI DUNG MÀN HÌNH (padding đáy cho bottom tab bar mobile) */}
      <main
        className={`flex-1 flex flex-col ${
          isSearchPage
            ? 'min-h-0 overflow-hidden pb-16 lg:pb-0'
            : !isDiscoveryRoute
              ? 'py-6 sm:py-8 pb-24 lg:pb-10'
              : 'pb-20 lg:pb-0'
        }`}
      >
        <Outlet />
      </main>

      {/* Footer hiển thị ở Trang chủ & Chi tiết phòng (không chèn ở Search split view) */}
      {isDiscoveryRoute && !isSearchPage && <Footer />}

      {/* Mobile Bottom Tab Bar (4 mục) */}
      <BottomTabBar />
    </div>
  );
};
