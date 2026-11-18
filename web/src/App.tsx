import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { bookingRoutes } from "./routes/bookingRoutes";

/**
 * Ứng dụng Web InnFinder
 * Gắn bookingRoutes độc lập của Thành viên 3, chuyển hướng mặc định tới /booking/appointments
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/booking/appointments" replace />,
  },
  bookingRoutes,
  {
    path: "*",
    element: <Navigate to="/booking/appointments" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
