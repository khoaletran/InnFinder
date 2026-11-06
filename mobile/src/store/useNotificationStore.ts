import { create } from 'zustand';

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0, // Mặc định 0 khi không có thông báo mới
  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
