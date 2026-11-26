import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosClient } from '@/api/axiosClient';
import { useAuthStore } from '@/store/useAuthStore';
import type { NotificationItem } from '@/types/auth-user.types';
import { formatVND } from '@/utils/formatters';

interface RawAppointment {
  maDatLich?: string;
  maPhongTro?: string;
  tieuDePhong?: string;
  diaChiPhong?: string;
  ngayHen?: string;
  thoiGianDat?: string;
  thoiGianTao?: string;
  trangThai?: string;
  tienCoc?: number;
  coc?: number;
  daNopCoc?: boolean;
  daNhanLaiCoc?: boolean;
  trangThaiHoanCoc?: string;
  liDoHuy?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  lastFetchedAt: number;
  lastUserId: string | null;
  readIdsByUser: Record<string, string[]>;
  fetchNotifications: (force?: boolean) => Promise<void>;
  setNotifications: (list: NotificationItem[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (item: NotificationItem) => void;
}

const CACHE_TTL_MS = 60 * 1000;

function mapAppointmentsToNotifications(
  appointments: RawAppointment[],
  readSet: Set<string>,
): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const apt of appointments) {
    const code = apt.maDatLich || '';
    if (!code) continue;
    const roomLabel = apt.tieuDePhong || apt.diaChiPhong || `Phòng #${apt.maPhongTro || ''}`;
    const createdAt = apt.thoiGianDat || apt.thoiGianTao || apt.ngayHen || new Date().toISOString();
    const status = apt.trangThai || 'CHO_XAC_NHAN';
    const coc = Number(apt.tienCoc ?? apt.coc ?? 0);
    const id = `apt-${code}-${status}`;

    if (status === 'CHO_XAC_NHAN') {
      if (coc > 0 && apt.daNopCoc === false) {
        items.push({
          id,
          title: 'Chờ nộp tiền cọc giữ chân',
          content: `Phiếu hẹn #${code} (${roomLabel}) đang chờ bạn nộp ${formatVND(coc)} tiền cọc giữ chân trong vòng 15 phút.`,
          type: 'TRANSACTION',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      } else {
        items.push({
          id,
          title: 'Lịch hẹn xem phòng đang chờ xác nhận',
          content: `Phiếu hẹn #${code} (${roomLabel}) đang chờ chủ trọ xác nhận thời gian gặp mặt.`,
          type: 'APPOINTMENT',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      }
    } else if (status === 'XAC_NHAN') {
      items.push({
        id,
        title: 'Chủ trọ đã xác nhận lịch xem phòng',
        content: `Lịch hẹn #${code} (${roomLabel}) đã được xác nhận. Hãy đến đúng giờ và xác nhận đã nhận lại cọc tại buổi xem.`,
        type: 'APPOINTMENT',
        createdAt,
        read: readSet.has(id),
        linkUrl: `/appointments/${code}`,
      });
    } else if (status === 'HOAN_THANH') {
      items.push({
        id,
        title: 'Giao dịch thuê phòng hoàn tất',
        content: `Phiếu hẹn #${code} (${roomLabel}) đã hoàn tất${coc > 0 ? ` • Cọc giữ chân: ${formatVND(coc)}` : ''}. Bạn có thể đánh giá phòng ngay!`,
        type: 'TRANSACTION',
        createdAt,
        read: readSet.has(id),
        linkUrl: `/appointments/${code}`,
      });
    } else if (status === 'HUY') {
      const reason = apt.liDoHuy || '';
      const lowerReason = reason.toLowerCase();
      const isForfeited =
        lowerReason.includes('sát giờ') ||
        lowerReason.includes('tịch thu cọc') ||
        lowerReason.includes('khách vắng mặt');

      if (!apt.daNopCoc || coc <= 0) {
        items.push({
          id,
          title: 'Lịch xem phòng đã hủy',
          content: `Phiếu hẹn #${code} (${roomLabel}) đã bị hủy.${reason ? ` Lý do: ${reason}` : ''}`,
          type: 'APPOINTMENT',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      } else if (apt.daNhanLaiCoc) {
        items.push({
          id,
          title: 'Lịch xem phòng đã kết thúc (không thuê)',
          content: `Phiếu hẹn #${code} (${roomLabel}) đã kết thúc sau khi bạn xác nhận đã nhận lại đủ ${formatVND(coc)} tiền cọc trực tiếp từ chủ trọ.`,
          type: 'APPOINTMENT',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      } else if (isForfeited) {
        items.push({
          id,
          title: 'Lịch xem phòng đã hủy (không hoàn cọc)',
          content: `Phiếu hẹn #${code} (${roomLabel}) đã hủy. Tiền cọc ${formatVND(coc)} không được hoàn lại và được dùng để bồi thường cho chủ trọ.${reason ? ` Lý do: ${reason}` : ''}`,
          type: 'TRANSACTION',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      } else if (apt.trangThaiHoanCoc === 'THANH_CONG') {
        items.push({
          id,
          title: 'Lịch xem phòng đã hủy — Đã hoàn cọc',
          content: `Phiếu hẹn #${code} (${roomLabel}) đã hủy và hệ thống đã hoàn trả ${formatVND(coc)} về tài khoản ngân hàng của bạn.${reason ? ` Lý do: ${reason}` : ''}`,
          type: 'TRANSACTION',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      } else {
        items.push({
          id,
          title: 'Lịch xem phòng đã hủy — Đang chờ hoàn cọc',
          content: `Phiếu hẹn #${code} (${roomLabel}) đã hủy. Hệ thống đang đối soát hoàn trả ${formatVND(coc)} về tài khoản ngân hàng của bạn.${reason ? ` Lý do: ${reason}` : ''}`,
          type: 'TRANSACTION',
          createdAt,
          read: readSet.has(id),
          linkUrl: `/appointments/${code}`,
        });
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      lastFetchedAt: 0,
      lastUserId: null,
      readIdsByUser: {},

      fetchNotifications: async (force = false) => {
        const { isAuthenticated, user } = useAuthStore.getState();
        if (!isAuthenticated || !user?.maNguoiDung) {
          set({ notifications: [], unreadCount: 0, lastUserId: null });
          return;
        }

        const userId = user.maNguoiDung;
        const now = Date.now();
        if (
          !force &&
          get().lastUserId === userId &&
          now - get().lastFetchedAt < CACHE_TTL_MS &&
          get().notifications.length > 0
        ) {
          return;
        }

        set({ isLoading: true });
        try {
          const data = await axiosClient.get<unknown, RawAppointment[]>(
            '/api/appointments/my-appointments',
          );
          const list = Array.isArray(data) ? data : [];
          const readSet = new Set(get().readIdsByUser[userId] || []);
          const mapped = mapAppointmentsToNotifications(list, readSet);
          set({
            notifications: mapped,
            unreadCount: mapped.filter((n) => !n.read).length,
            isLoading: false,
            lastFetchedAt: Date.now(),
            lastUserId: userId,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      setNotifications: (list) => {
        set({
          notifications: list,
          unreadCount: list.filter((n) => !n.read).length,
        });
      },

      markAsRead: (id) => {
        const userId = useAuthStore.getState().user?.maNguoiDung || 'guest';
        set((state) => {
          const prevIds = state.readIdsByUser[userId] || [];
          const nextIds = prevIds.includes(id) ? prevIds : [...prevIds, id].slice(-300);
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
            readIdsByUser: {
              ...state.readIdsByUser,
              [userId]: nextIds,
            },
          };
        });
      },

      markAllAsRead: () => {
        const userId = useAuthStore.getState().user?.maNguoiDung || 'guest';
        set((state) => {
          const prevIds = new Set(state.readIdsByUser[userId] || []);
          for (const n of state.notifications) prevIds.add(n.id);
          return {
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
            readIdsByUser: {
              ...state.readIdsByUser,
              [userId]: Array.from(prevIds).slice(-300),
            },
          };
        });
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
    }),
    {
      name: 'innfinder_notification_storage',
      partialize: (state) => ({
        readIdsByUser: state.readIdsByUser,
      }),
    },
  ),
);
