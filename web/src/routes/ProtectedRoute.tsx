import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import type { VaiTro } from '@/types/auth-user.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: VaiTro[];
  requireChuTro?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireChuTro,
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    const target = `${location.pathname}${location.search}`;
    const loginUrl = `/login?returnUrl=${encodeURIComponent(target)}`;
    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.vaiTro)) {
    if (user.vaiTro === 'QUAN_TRI') {
      if (location.pathname.startsWith('/profile/security')) {
        return <Navigate to="/admin/profile/security" replace />;
      }
      if (location.pathname.startsWith('/profile')) {
        return <Navigate to="/admin/profile" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/profile" replace />;
  }

  if (requireChuTro && !user?.chuTro) {
    return <Navigate to="/profile?tab=upgrade" replace />;
  }

  return <>{children}</>;
};
