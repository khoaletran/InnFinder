import React, { lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProfileInfoTab } from '@/components/profile/ProfileInfoTab';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { LandlordLayout } from '@/layouts/LandlordLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Auth Pages (Thành viên 1)
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Admin Console Pages (Thành viên 1)
import { AdminProfileInfoTab } from '@/components/admin/AdminProfileInfoTab';
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { ComplaintsAdminPage } from '@/pages/admin/ComplaintsAdminPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { PostsPage } from '@/pages/admin/PostsPage';
import { ReviewsPage } from '@/pages/admin/ReviewsPage';
import { StatisticsPage } from '@/pages/admin/StatisticsPage';
import { TransactionsPage } from '@/pages/admin/TransactionsPage';
import { UsersPage } from '@/pages/admin/UsersPage';

// Customer Discovery & Details Pages (Thành viên 2)
import { FavoritesPage } from '@/pages/customer/FavoritesPage';
import { HomePage } from '@/pages/customer/HomePage';
import { RoomDetailPage } from '@/pages/customer/RoomDetailPage';
import { SearchPage } from '@/pages/customer/SearchPage';

// Customer Profile, Notifications & Complaints Pages (Thành viên 1)
import { ComplaintsPage } from '@/pages/customer/ComplaintsPage';
import { NotificationsPage } from '@/pages/customer/NotificationsPage';
import { ProfilePage } from '@/pages/customer/ProfilePage';

// Customer Booking, Deposit, Rentals, Wallet & Review Pages (Thành viên 3)
import { AppointmentDetailPage } from '@/pages/customer/AppointmentDetailPage';
import { AppointmentsPage } from '@/pages/customer/AppointmentsPage';
import { DepositPaymentPage } from '@/pages/customer/DepositPaymentPage';
import { ReviewPage } from '@/pages/customer/ReviewPage';
import { SchedulePage } from '@/pages/customer/SchedulePage';
import { TransactionDetailPage } from '@/pages/customer/TransactionDetailPage';
import { TransactionsPage as CustomerTransactionsPage } from '@/pages/customer/TransactionsPage';
import { WalletPage as CustomerWalletPage } from '@/pages/customer/WalletPage';

// Landlord Portal Pages (Thành viên 4)
import { AppointmentsPage as LandlordAppointmentsPage } from '@/pages/landlord/AppointmentsPage';
import { CreateRoomPage } from '@/pages/landlord/CreateRoomPage';
import { DashboardPage as LandlordDashboardPage } from '@/pages/landlord/DashboardPage';
import { ReviewsComplaintsPage } from '@/pages/landlord/ReviewsComplaintsPage';
import { RoomsPage } from '@/pages/landlord/RoomsPage';
import { WalletPage as LandlordWalletPage } from '@/pages/landlord/WalletPage';

const ProfileBankTab = lazy(() => import('@/components/profile/ProfileBankTab'));
const ProfileSecurityTab = lazy(() => import('@/components/profile/ProfileSecurityTab'));

const LegacyDepositRedirect: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  return <Navigate to={`/appointments/deposit/${appointmentId || ''}`} replace />;
};

const LegacyRentalRedirect: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  return <Navigate to={`/appointments/${appointmentId || ''}`} replace />;
};

const LegacyReviewRedirect: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  return <Navigate to={`/reviews/create/${roomId || ''}`} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. CUSTOMER PUBLIC & DISCOVERY ROUTES */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/room/:id" element={<RoomDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
      </Route>

      {/* 2. PUBLIC AUTH ROUTES (Thành viên 1) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['KHACH_HANG']}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        {/* Thành viên 1: Hồ sơ, Thông báo, Khiếu nại */}
        <Route path="/profile" element={<ProfilePage />}>
          <Route index element={<ProfileInfoTab />} />
          <Route path="bank" element={<ProfileBankTab />} />
          <Route path="security" element={<ProfileSecurityTab />} />
        </Route>
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />

        {/* Thành viên 3: Đặt lịch, Cọc, Quyết định thuê, Ví & Sổ cái, Đánh giá */}
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/schedule" element={<SchedulePage />} />
        <Route path="/appointments/schedule/:roomId" element={<SchedulePage />} />
        <Route path="/appointments/deposit/:appointmentId" element={<DepositPaymentPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        <Route path="/rentals" element={<Navigate to="/appointments" replace />} />
        <Route path="/rentals/:appointmentId" element={<LegacyRentalRedirect />} />
        <Route path="/wallet" element={<CustomerWalletPage />} />
        <Route path="/transactions" element={<CustomerTransactionsPage />} />
        <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
        <Route path="/reviews/create/:roomId" element={<ReviewPage />} />

        {/* Tương thích ngược các đường dẫn cũ (/customer/* & /booking/*) */}
        <Route path="/customer" element={<Navigate to="/profile" replace />} />
        <Route path="/customer/profile" element={<Navigate to="/profile" replace />} />
        <Route path="/customer/notifications" element={<Navigate to="/notifications" replace />} />
        <Route path="/customer/complaints" element={<Navigate to="/complaints" replace />} />
        <Route path="/booking/appointments" element={<Navigate to="/appointments" replace />} />
        <Route path="/booking/rental-requests" element={<Navigate to="/appointments" replace />} />
        <Route path="/booking/schedule" element={<SchedulePage />} />
        <Route path="/booking/schedule/:roomId" element={<SchedulePage />} />
        <Route path="/booking/deposit/:appointmentId" element={<LegacyDepositRedirect />} />
        <Route path="/booking/rental/:appointmentId" element={<LegacyRentalRedirect />} />
        <Route path="/booking/transactions" element={<Navigate to="/transactions" replace />} />
        <Route path="/booking/review/:roomId" element={<LegacyReviewRedirect />} />
      </Route>

      {/* 4. LANDLORD PORTAL ROUTES (Thành viên 4) */}
      <Route
        path="/landlord"
        element={
          <ProtectedRoute requireChuTro={true}>
            <LandlordLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/landlord/dashboard" replace />} />
        <Route path="dashboard" element={<LandlordDashboardPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="rooms/create" element={<CreateRoomPage />} />
        <Route path="rooms/edit/:id" element={<CreateRoomPage isEdit={true} />} />
        <Route path="appointments" element={<LandlordAppointmentsPage />} />
        <Route path="wallet" element={<LandlordWalletPage />} />
        <Route path="reviews" element={<ReviewsComplaintsPage />} />
      </Route>

      {/* 5. ADMIN CONSOLE ROUTES (Thành viên 1) */}
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
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="complaints" element={<ComplaintsAdminPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="statistics" element={<StatisticsPage />} />
        <Route path="profile" element={<AdminProfilePage />}>
          <Route index element={<AdminProfileInfoTab />} />
          <Route path="security" element={<ProfileSecurityTab />} />
        </Route>
      </Route>

      {/* Catch-all 404 redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
