import React from 'react';
import { Calendar, Heart, Home, Search, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useRoomFilterStore } from '@/store/useRoomFilterStore';

export const BottomTabBar: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const favoriteCount = useFavoriteStore((s) => s.favoriteIds.length);
  const lastSearchMode = useRoomFilterStore((s) => s.lastSearchMode);
  const searchPath = lastSearchMode === 'map' ? '/search/map' : '/search';

  const tabs = isAdmin
    ? [
        { label: 'Trang chủ', path: '/', icon: Home, end: true },
        { label: 'Tìm phòng', path: searchPath, icon: Search, end: false },
        { label: 'Yêu thích', path: '/favorites', icon: Heart, end: false },
        { label: 'Quản trị', path: '/admin/dashboard', icon: User, end: false },
      ]
    : [
        { label: 'Trang chủ', path: '/', icon: Home, end: true },
        { label: 'Tìm phòng', path: searchPath, icon: Search, end: false },
        { label: 'Yêu thích', path: '/favorites', icon: Heart, end: false },
        { label: 'Lịch', path: '/appointments', icon: Calendar, end: false },
        {
          label: 'Tài khoản',
          path: isAuthenticated ? '/profile' : '/login',
          icon: User,
          end: false,
        },
      ];

  return (
    <nav
      aria-label="Điều hướng di động"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border px-1.5 pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-5'} h-16`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isFav = tab.path === '/favorites';
          return (
            <NavLink
              key={tab.label}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] leading-tight whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-text-muted font-medium hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className="w-5 h-5 stroke-[1.75]" />
                    {isFav && favoriteCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {favoriteCount > 99 ? '99+' : favoriteCount}
                      </span>
                    )}
                  </span>
                  <span>{tab.label}</span>
                  {isActive && <span className="sr-only">(đang chọn)</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
