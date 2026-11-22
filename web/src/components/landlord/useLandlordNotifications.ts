import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosClient } from '@/api/axiosClient';
import { useAuthStore } from '@/store/useAuthStore';
import type { NotificationItem } from '@/types/auth-user.types';

interface ReadState {
  readByUser: Record<string, string[]>;
  mark: (user: string, ids: string[]) => void;
}
const useReadState = create<ReadState>()(persist((set) => ({
  readByUser: {},
  mark: (user, ids) => set((state) => ({ readByUser: {
    ...state.readByUser, [user]: [...new Set([...(state.readByUser[user] ?? []), ...ids])].slice(-500),
  } })),
}), { name: 'innfinder_landlord_notification_reads', partialize: (state) => ({ readByUser: state.readByUser }) }));

export function useLandlordNotifications() {
  const user = useAuthStore((state) => state.user?.maNguoiDung ?? '');
  const { readByUser, mark } = useReadState();
  const query = useQuery({
    queryKey: ['landlord', 'notifications', user],
    queryFn: () => axiosClient.get<unknown, NotificationItem[]>('/api/landlord/notifications'),
    enabled: !!user, refetchInterval: 30000,
  });
  const read = new Set(readByUser[user] ?? []);
  const notifications = (query.data ?? []).map((item) => ({ ...item, read: read.has(item.id) }));
  return {
    notifications, unreadCount: notifications.filter((item) => !item.read).length,
    isLoading: query.isLoading, error: query.error, refetch: query.refetch,
    markAsRead: (id: string) => mark(user, [id]),
    markAllAsRead: () => mark(user, notifications.map((item) => item.id)),
  };
}
