import { create } from 'zustand';
import { landlordService } from '../services/landlord.service';

export type LandlordNotificationType = 'ROOM_APPROVAL' | 'APPOINTMENT' | 'PAYMENT' | 'ROOM_REJECT';

export interface LandlordNotificationItem {
  id: string;
  type: LandlordNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  isRead: boolean;
  targetRoute: string;
}

interface LandlordNotificationState {
  notifications: LandlordNotificationItem[];
  readIds: string[];
  lastFetched: number;
  isLoading: boolean;
  unreadCount: number;

  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const CACHE_TTL_MS = 60 * 1000; // 60 giây cache hạn dòng (không gọi mạng liên tục)

export const useLandlordNotificationStore = create<LandlordNotificationState>((set, get) => ({
  notifications: [],
  readIds: [],
  lastFetched: 0,
  isLoading: false,
  unreadCount: 0,

  fetchNotifications: async (force = false) => {
    const now = Date.now();
    const { lastFetched, readIds, isLoading } = get();

    // 1. Kiểm tra Cache TTL: Nếu chưa quá 60s và không cưỡng chế (pull-to-refresh) thì bỏ qua
    if (!force && now - lastFetched < CACHE_TTL_MS && get().notifications.length > 0) {
      return;
    }

    if (isLoading) return;
    set({ isLoading: true });

    try {
      // 2. Tải song song dữ liệu thật từ Backend (Phòng, Lịch hẹn, Giao dịch)
      const [rooms, appointments, transactions] = await Promise.all([
        landlordService.getMyRooms(),
        landlordService.getAppointments(),
        landlordService.getTransactions(),
      ]);

      const items: LandlordNotificationItem[] = [];

      // A. Thông báo từ Phòng trọ
      rooms.slice(0, 5).forEach((r) => {
        if (r.trangThai === 'DA_DUYET') {
          items.push({
            id: `notif-room-approved-${r.id}`,
            type: 'ROOM_APPROVAL',
            title: 'Bài đăng phòng đã được duyệt',
            message: `Phòng ${r.tenPhong} đã được Admin duyệt và hiển thị công khai trên InnFinder.`,
            time: 'Gần đây',
            timestamp: now - 3600 * 1000,
            isRead: readIds.includes(`notif-room-approved-${r.id}`),
            targetRoute: `/room/${r.id}`,
          });
        } else if (r.trangThai === 'HUY') {
          items.push({
            id: `notif-room-rejected-${r.id}`,
            type: 'ROOM_REJECT',
            title: 'Bài đăng bị từ chối / gỡ bỏ',
            message: `Bài đăng ${r.tenPhong} chưa đạt yêu cầu kiểm duyệt hoặc bị gỡ bỏ bởi Admin.`,
            time: 'Gần đây',
            timestamp: now - 7200 * 1000,
            isRead: readIds.includes(`notif-room-rejected-${r.id}`),
            targetRoute: '/(landlord)/my-posts',
          });
        } else if (r.trangThai === 'CHO_DUYET') {
          items.push({
            id: `notif-room-pending-${r.id}`,
            type: 'ROOM_APPROVAL',
            title: 'Đã gửi bài đăng chờ duyệt',
            message: `Bài đăng ${r.tenPhong} đã gửi thành công, đang chờ Admin duyệt.`,
            time: 'Vừa xong',
            timestamp: now - 1800 * 1000,
            isRead: readIds.includes(`notif-room-pending-${r.id}`),
            targetRoute: '/(landlord)/my-posts',
          });
        }
      });

      // B. Thông báo từ Lịch hẹn
      appointments.slice(0, 8).forEach((a) => {
        if (a.trangThai === 'CHO_XAC_NHAN') {
          items.push({
            id: `notif-apt-new-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Có khách đặt lịch xem phòng mới',
            message: `Khách ${a.khachHangTen} vừa hẹn xem ${a.phongTen} vào ngày ${a.ngayHen} (${a.thoiGian}).`,
            time: 'Mới nhận',
            timestamp: now - 600 * 1000,
            isRead: readIds.includes(`notif-apt-new-${a.id}`),
            targetRoute: '/(landlord)/appointments',
          });
        } else if (a.trangThai === 'XAC_NHAN') {
          items.push({
            id: `notif-apt-confirmed-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Lịch xem phòng đã xác nhận',
            message: `Lịch hẹn xem ${a.phongTen} với khách ${a.khachHangTen} đã được bạn xác nhận.`,
            time: 'Đã xác nhận',
            timestamp: now - 3600 * 2000,
            isRead: readIds.includes(`notif-apt-confirmed-${a.id}`),
            targetRoute: '/(landlord)/appointments',
          });
        } else if (a.trangThai === 'HOAN_THANH') {
          items.push({
            id: `notif-apt-completed-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Chốt hợp đồng thuê thành công',
            message: `Phòng ${a.phongTen} đã được cho khách ${a.khachHangTen} thuê thành công.`,
            time: 'Hoàn tất',
            timestamp: now - 86400 * 1000,
            isRead: readIds.includes(`notif-apt-completed-${a.id}`),
            targetRoute: '/(landlord)/appointments',
          });
        }
      });

      // C. Thông báo từ Biến động ví / Giao dịch
      transactions.slice(0, 5).forEach((t) => {
        if (t.thucNhan > 0) {
          items.push({
            id: `notif-tx-${t.id}`,
            type: 'PAYMENT',
            title: 'Tiền cọc thuê phòng được cộng vào ví',
            message: `+${t.thucNhan.toLocaleString('vi-VN')} đ từ giao dịch thuê phòng (đã trừ ${t.phiDichVu.toLocaleString('vi-VN')} đ phí sàn).`,
            time: t.ngayGiaoDich || 'Hôm nay',
            timestamp: now - 1200 * 1000,
            isRead: readIds.includes(`notif-tx-${t.id}`),
            targetRoute: '/(landlord)/transactions',
          });
        }
      });

      // Sắp xếp thông báo mới nhất lên đầu
      items.sort((a, b) => b.timestamp - a.timestamp);

      const unreadCount = items.filter((x) => !x.isRead).length;

      set({
        notifications: items,
        lastFetched: now,
        isLoading: false,
        unreadCount,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    const { readIds, notifications } = get();
    if (!readIds.includes(id)) {
      const updatedReadIds = [...readIds, id];
      const updatedNotifications = notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = updatedNotifications.filter((x) => !x.isRead).length;

      set({
        readIds: updatedReadIds,
        notifications: updatedNotifications,
        unreadCount,
      });
    }
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const allIds = notifications.map((n) => n.id);
    const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));

    set({
      readIds: allIds,
      notifications: updatedNotifications,
      unreadCount: 0,
    });
  },
}));
