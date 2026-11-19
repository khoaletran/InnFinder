import React from 'react';
import { Calendar, Home, Search, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export const BottomTabBar: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const tabs = [
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
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.label}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                  isActive ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
