import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Public Guest & Tenant Pages (Phân hệ Người 2 - Tìm kiếm, Bản đồ & Chi tiết phòng)
import { HomePage } from '../pages/HomePage';
import { SearchMapPage } from '../pages/SearchMapPage';
import { RoomDetailPage } from '../pages/RoomDetailPage';
import { FavoritesPage } from '../pages/FavoritesPage';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

// Customer Pages (Phân hệ Người 1)
import { ProfilePage } from '../pages/customer/ProfilePage';
import { NotificationsPage } from '../pages/customer/NotificationsPage';
import { ComplaintsPage } from '../pages/customer/ComplaintsPage';

// Booking Pages (Phân hệ Người 3 - Đặt lịch, Cọc, Thuê phòng, Giao dịch & Đánh giá)
import { AppointmentsPage } from '../pages/booking/AppointmentsPage';
import { RentalDetailPage } from '../pages/booking/RentalDetailPage';
import { TransactionsPage as CustomerTransactionsPage } from '../pages/booking/TransactionsPage';
import { TransactionDetailPage } from '../pages/booking/TransactionDetailPage';
import { SchedulePage } from '../pages/booking/SchedulePage';
import { DepositPaymentPage } from '../pages/booking/DepositPaymentPage';
import { ReviewPage } from '../pages/booking/ReviewPage';

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

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. PUBLIC TENANT & GUEST ROUTES (Phân hệ Người 2) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchMapPage />} />
      <Route path="/room/:id" element={<RoomDetailPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />

      {/* 2. PUBLIC AUTH ROUTES */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* 3. PROTECTED CUSTOMER ROUTES (Phân hệ Người 1) */}
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

      {/* 4. PHÂN HỆ KHÁCH THUÊ (Người 3 - Đặt lịch, Thuê phòng, Giao dịch) */}
      <Route
        element={
          <ProtectedRoute>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/rentals" element={<AppointmentsPage />} />
        <Route path="/rentals/:appointmentId" element={<RentalDetailPage />} />
        <Route path="/transactions" element={<CustomerTransactionsPage />} />
        <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />

        {/* Cấu hình đầy đủ các route /booking/* theo đặc tả AGENTS.md */}
        <Route path="/booking/appointments" element={<AppointmentsPage />} />
        <Route path="/booking/schedule" element={<SchedulePage />} />
        <Route path="/booking/schedule/:roomId" element={<SchedulePage />} />
        <Route path="/booking/deposit/:appointmentId" element={<DepositPaymentPage />} />
        <Route path="/booking/rental/:appointmentId" element={<RentalDetailPage />} />
        <Route path="/booking/transactions" element={<CustomerTransactionsPage />} />
        <Route path="/booking/transactions/:transactionId" element={<TransactionDetailPage />} />
        <Route path="/booking/review/:roomId" element={<ReviewPage />} />
      </Route>

      {/* 5. PROTECTED ADMIN CONSOLE ROUTES */}
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
