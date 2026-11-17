import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../store/useAuthStore';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Customer Pages (Phân hệ Người 1)
import { ProfilePage } from '../pages/customer/ProfilePage';
import { NotificationsPage } from '../pages/customer/NotificationsPage';
import { ComplaintsPage } from '../pages/customer/ComplaintsPage';

// Admin Pages (Phân hệ Web Admin Console)
import { DashboardPage } from '../pages/admin/DashboardPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { PostsPage } from '../pages/admin/PostsPage';
import { ViewingsPage } from '../pages/admin/ViewingsPage';
import { TransactionsPage } from '../pages/admin/TransactionsPage';
import { ReviewsPage } from '../pages/admin/ReviewsPage';
import { ComplaintsAdminPage } from '../pages/admin/ComplaintsAdminPage';
import { CategoriesPage } from '../pages/admin/CategoriesPage';
import { StatisticsPage } from '../pages/admin/StatisticsPage';

// Component giữ chỗ cho các màn hình của Thành viên 2, 3, 4 sẽ ghép nối
const MemberPlaceholder: React.FC<{ member: string; title: string }> = ({ member, title }) => (
  <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12">
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 font-bold text-base">
      IF
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-xs text-slate-500 mb-4">
      Khung route đã sẵn sàng để <strong>{member}</strong> kết nối giao diện Web.
    </p>
    <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-mono">
      Ready for integration
    </div>
  </div>
);

// Điều hướng trang chủ dựa trên trạng thái đăng nhập
const HomeRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/customer/profile" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* 1. PUBLIC AUTH ROUTES */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* 2. PROTECTED CUSTOMER ROUTES */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
      </Route>

      {/* Route placeholders cho Khách thuê (Người 2 & Người 3) */}
      <Route
        element={
          <ProtectedRoute>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/favorites"
          element={<MemberPlaceholder member="Thành viên 2" title="Danh sách Phòng yêu thích" />}
        />
        <Route
          path="/appointments"
          element={<MemberPlaceholder member="Thành viên 3" title="Lịch xem phòng của bạn" />}
        />
        <Route
          path="/rentals"
          element={<MemberPlaceholder member="Thành viên 3" title="Tiến trình Yêu cầu thuê" />}
        />
        <Route
          path="/transactions"
          element={<MemberPlaceholder member="Thành viên 3" title="Lịch sử Giao dịch cọc" />}
        />
      </Route>

      {/* 3. PROTECTED ADMIN CONSOLE ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['QUAN_TRI']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="viewings" element={<ViewingsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="complaints" element={<ComplaintsAdminPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
      </Route>

      {/* Catch-all 404 redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
