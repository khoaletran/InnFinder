import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const { user, isAuthenticated } = useAuthStore();

  // Nếu đã đăng nhập với vai trò Quản trị viên -> Đi thẳng vào Admin Dashboard
  if (isAuthenticated && user?.vaiTro === 'QUAN_TRI') {
    return <Redirect href="/(admin)" />;
  }

  // Mặc định khách vãng lai hoặc khách thuê vào trang chủ tìm kiếm phòng
  return <Redirect href="/(tenant)" />;
}
