import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { VaiTro } from '../types/auth-user.types';

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.vaiTro)) {
    if (user.vaiTro === 'QUAN_TRI') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/customer/profile" replace />;
  }

  if (requireChuTro && !user?.chuTro) {
    return <Navigate to="/customer/profile" replace />;
  }

  return <>{children}</>;
};
