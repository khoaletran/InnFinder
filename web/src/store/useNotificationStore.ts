import { create } from 'zustand';
import type { NotificationItem } from '../types/auth-user.types';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (list: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (item: NotificationItem) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Lịch hẹn xem phòng đã được xác nhận',
    content: 'Chủ trọ Nguyễn Văn A đã đồng ý lịch hẹn xem phòng Studio ban công lúc 09:30 ngày mai.',
    type: 'APPOINTMENT',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
    linkUrl: '/customer/appointments',
  },
  {
    id: 'notif-2',
    title: 'Hồ sơ nâng cấp Chủ trọ đang được xử lý',
    content: 'Yêu cầu xác thực CCCD và tài khoản ngân hàng của bạn đã được chuyển tới Admin kiểm duyệt.',
    type: 'SYSTEM',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    linkUrl: '/customer/profile',
  },
  {
    id: 'notif-3',
    title: 'Biên lai tạm giữ cọc giữ chân',
    content: 'Hệ thống đã nhận tạm giữ 200.000 ₫ cho phiếu đặt lịch hẹn PT-10029.',
    type: 'TRANSACTION',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    linkUrl: '/customer/transactions',
  },
];

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: DEFAULT_NOTIFICATIONS,
  unreadCount: DEFAULT_NOTIFICATIONS.filter((n) => !n.read).length,

  setNotifications: (list) => {
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (item) => {
    set((state) => {
      const updated = [item, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },
}));
