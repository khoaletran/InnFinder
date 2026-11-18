import { Navigate, type RouteObject } from "react-router-dom";
import { BookingLayout } from "../pages/booking/BookingLayout";
import { SchedulePage } from "../pages/booking/SchedulePage";
import { DepositPaymentPage } from "../pages/booking/DepositPaymentPage";
import { AppointmentsPage } from "../pages/booking/AppointmentsPage";
import { RentalRequestsPage } from "../pages/booking/RentalRequestsPage";
import { RentalDetailPage } from "../pages/booking/RentalDetailPage";
import { TransactionsPage } from "../pages/booking/TransactionsPage";
import { TransactionDetailPage } from "../pages/booking/TransactionDetailPage";
import { ReviewPage } from "../pages/booking/ReviewPage";

/**
 * ==============================================================================
 * CẤU HÌNH ROUTE ĐỘC LẬP CHO PHÂN HỆ KHÁCH THUÊ (THÀNH VIÊN 3)
 * ==============================================================================
 * Module: Đặt lịch xem, Nộp cọc, Tiến trình thuê, Giao dịch & Đánh giá
 * Toàn bộ route được đóng gói dưới path "/booking/*".
 * Sau này khi tích hợp vào Navigation tổng của nhóm, chỉ cần import bookingRoutes
 * và gắn trực tiếp vào App router chính mà KHÔNG CẦN VIẾT LẠI.
 * ==============================================================================
 */
export const bookingRoutes: RouteObject = {
  path: "booking",
  element: <BookingLayout />,
  children: [
    { index: true, element: <Navigate to="appointments" replace /> },
    { path: "schedule", element: <SchedulePage /> },
    { path: "deposit/:appointmentId", element: <DepositPaymentPage /> },
    { path: "appointments", element: <AppointmentsPage /> },
    { path: "rental-requests", element: <RentalRequestsPage /> },
    { path: "rental/:appointmentId", element: <RentalDetailPage /> },
    { path: "transactions", element: <TransactionsPage /> },
    { path: "transactions/:transactionId", element: <TransactionDetailPage /> },
    { path: "review/:roomId", element: <ReviewPage /> },
  ],
};

export default bookingRoutes;
