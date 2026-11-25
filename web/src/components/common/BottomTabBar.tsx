import React from 'react';
import { Calendar, Home, Search, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export const BottomTabBar: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const tabs = isAdmin
    ? [
        { label: 'Trang chủ', path: '/', icon: Home, end: true },
        { label: 'Tìm phòng', path: '/search', icon: Search, end: false },
        { label: 'Quản trị', path: '/admin/dashboard', icon: User, end: false },
      ]
    : [
        { label: 'Trang chủ', path: '/', icon: Home, end: true },
        { label: 'Tìm phòng', path: '/search', icon: Search, end: false },
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-4'} h-16`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.label}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-text-muted font-medium hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5 stroke-[1.75]" />
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
