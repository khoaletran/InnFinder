import { Redirect } from 'expo-router';

export default function Index() {
  // Mở app luôn luôn vào thẳng Trang chủ Khách thuê để xem phòng trọ (không bắt buộc đăng nhập)
  return <Redirect href="/(tenant)" />;
}
