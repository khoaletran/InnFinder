import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  Heart,
  Home,
  LayoutDashboard,
  Layers,
  MessageSquare,
  PlusCircle,
  Receipt,
  Search,
  Star,
  User,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export const PUBLIC_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Trang chủ', path: '/', icon: Home, end: true },
  { label: 'Tìm phòng & Bản đồ', path: '/search', icon: Search },
  { label: 'Yêu thích', path: '/favorites', icon: Heart },
];

export const CUSTOMER_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Khám phá phòng', path: '/', icon: Home, end: true },
  { label: 'Phòng yêu thích', path: '/favorites', icon: Heart },
  { label: 'Lịch xem phòng', path: '/appointments', icon: Calendar },
  { label: 'Quyết định thuê', path: '/rentals', icon: FileCheck2 },
  { label: 'Quản lý ví', path: '/wallet', icon: Wallet },
  { label: 'Sổ cái giao dịch', path: '/transactions', icon: Receipt },
  { label: 'Thông báo', path: '/notifications', icon: Bell },
  { label: 'Hồ sơ cá nhân', path: '/profile', icon: User },
  { label: 'Gửi khiếu nại', path: '/complaints', icon: AlertTriangle },
];

export const LANDLORD_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Tổng quan Chủ trọ', path: '/landlord/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Quản lý phòng trọ', path: '/landlord/rooms', icon: Building2 },
  { label: 'Đăng phòng mới', path: '/landlord/rooms/create', icon: PlusCircle },
  { label: 'Lịch hẹn xem phòng', path: '/landlord/appointments', icon: CalendarCheck },
  { label: 'Ví & Rút tiền', path: '/landlord/wallet', icon: Wallet },
  { label: 'Đánh giá & Khiếu nại', path: '/landlord/reviews', icon: MessageSquare },
];

export const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { label: 'Tổng quan sàn', path: '/admin/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Người dùng & CCCD', path: '/admin/users', icon: Users },
  { label: 'Kiểm duyệt phòng', path: '/admin/posts', icon: Building2 },
  { label: 'Giám sát lịch xem', path: '/admin/viewings', icon: CalendarCheck },
  { label: 'Sổ cái giao dịch', path: '/admin/transactions', icon: CreditCard },
  { label: 'Kiểm duyệt đánh giá', path: '/admin/reviews', icon: Star },
  { label: 'Xử lý khiếu nại', path: '/admin/complaints', icon: AlertTriangle },
  { label: 'Danh mục & Phí sàn', path: '/admin/categories', icon: Layers },
  { label: 'Thống kê doanh thu', path: '/admin/statistics', icon: BarChart3 },
];
