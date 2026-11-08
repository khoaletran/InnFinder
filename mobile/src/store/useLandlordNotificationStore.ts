import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { landlordService } from '../services/landlord.service';
import { useAuthStore } from './useAuthStore';
import { formatVND } from '../utils/formatVND';

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
  currentUserId?: string;
  notifications: LandlordNotificationItem[];
  readIds: string[];
  lastFetched: number;
  isLoading: boolean;
  unreadCount: number;

  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const CACHE_TTL_MS = 60 * 1000; // 60 giây cache hạn dòng (không gọi mạng liên tục)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // Giới hạn chỉ lấy sự kiện trong 7 ngày

/**
 * Lấy storage key gắn theo mã người dùng để lưu bền vững
 */
const getStorageKey = () => {
  const user = useAuthStore.getState().user;
  const userId = user?.maNguoiDung || 'guest_landlord';
  return `innfinder_read_notifs_${userId}`;
};

/**
 * Đọc danh sách ID thông báo đã đọc từ SecureStore
 */
const loadPersistedReadIds = async (): Promise<string[]> => {
  try {
    const raw = await SecureStore.getItemAsync(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Lỗi đọc readIds từ SecureStore:', e);
  }
  return [];
};

/**
 * Lưu danh sách ID thông báo đã đọc vào SecureStore
 */
const savePersistedReadIds = async (ids: string[]) => {
  try {
    // Chỉ lưu 300 ID gần nhất để tránh phình dữ liệu
    const toSave = ids.slice(-300);
    await SecureStore.setItemAsync(getStorageKey(), JSON.stringify(toSave));
  } catch (e) {
    console.warn('Lỗi lưu readIds vào SecureStore:', e);
  }
};

/**
 * Parse ngày an toàn sang timestamp (ms)
 */
function parseSafeDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  if (!isNaN(parsed) && parsed > 0) return parsed;

  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
      if (!isNaN(d)) return d;
    } else if (parts[2].length === 4) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      if (!isNaN(d)) return d;
    }
  }
  return 0;
}

/**
 * Định dạng thời gian thông báo cụ thể (giờ:phút, ngày/tháng)
 */
function formatNotificationTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return 'Vừa xong';
  const now = Date.now();
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Hôm nay, ${timeStr}`;
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Hôm qua, ${timeStr}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${timeStr} - ${day}/${month}/${year}`;
}

export const useLandlordNotificationStore = create<LandlordNotificationState>((set, get) => ({
  notifications: [],
  readIds: [],
  lastFetched: 0,
  isLoading: false,
  unreadCount: 0,

  fetchNotifications: async (force = false) => {
    const now = Date.now();
    const { lastFetched, isLoading } = get();

    // 1. Kiểm tra Cache TTL: Nếu chưa quá 60s và không cưỡng chế (pull-to-refresh) thì bỏ qua
    if (!force && now - lastFetched < CACHE_TTL_MS && get().notifications.length > 0) {
      return;
    }

    if (isLoading) return;
    set({ isLoading: true });

    try {
      // 2. Nạp danh sách đã đọc từ SecureStore theo định danh người dùng hiện tại
      const user = useAuthStore.getState().user;
      const currentUserId = user?.maNguoiDung || 'guest_landlord';
      let currentReadIds = get().readIds;

      if (get().currentUserId !== currentUserId) {
        // Đổi tài khoản hoặc đăng nhập mới -> nạp lại readIds tương ứng
        currentReadIds = await loadPersistedReadIds();
        set({ currentUserId, readIds: currentReadIds });
      } else if (currentReadIds.length === 0) {
        currentReadIds = await loadPersistedReadIds();
        set({ readIds: currentReadIds });
      }

      // 3. Tải song song dữ liệu thật từ Backend (Phòng, Lịch hẹn, Giao dịch)
      const [rooms, appointments, transactions] = await Promise.all([
        landlordService.getMyRooms(),
        landlordService.getAppointments(),
        landlordService.getTransactions(),
      ]);

      const items: LandlordNotificationItem[] = [];

      // A. Thông báo từ Phòng trọ (Chỉ lấy trong vòng 7 ngày gần nhất)
      rooms.forEach((r) => {
        const roomTimestamp = parseSafeDate(r.thoiGianDang) || (now - 2 * 3600 * 1000);
        const isRecentRoom = now - roomTimestamp <= SEVEN_DAYS_MS || r.trangThai === 'CHO_DUYET';
        if (!isRecentRoom) return;

        if (r.trangThai === 'DA_DUYET') {
          items.push({
            id: `notif-room-approved-${r.id}`,
            type: 'ROOM_APPROVAL',
            title: 'Bài đăng phòng đã được duyệt',
            message: `Phòng ${r.tenPhong} đã được Admin duyệt và hiển thị công khai trên InnFinder.`,
            time: formatNotificationTime(roomTimestamp),
            timestamp: roomTimestamp,
            isRead: currentReadIds.includes(`notif-room-approved-${r.id}`),
            targetRoute: `/room/${r.id}`,
          });
        } else if (r.trangThai === 'HUY') {
          items.push({
            id: `notif-room-rejected-${r.id}`,
            type: 'ROOM_REJECT',
            title: 'Bài đăng bị từ chối / gỡ bỏ',
            message: `Bài đăng ${r.tenPhong} chưa đạt yêu cầu kiểm duyệt hoặc bị từ chối bởi Admin.`,
            time: formatNotificationTime(roomTimestamp),
            timestamp: roomTimestamp,
            isRead: currentReadIds.includes(`notif-room-rejected-${r.id}`),
            targetRoute: `/(landlord)/my-posts?status=REJECTED&postId=${r.id}`,
          });
        } else if (r.trangThai === 'CHO_DUYET') {
          items.push({
            id: `notif-room-pending-${r.id}`,
            type: 'ROOM_APPROVAL',
            title: 'Đã gửi bài đăng chờ duyệt',
            message: `Bài đăng ${r.tenPhong} đã gửi thành công, đang chờ Admin duyệt.`,
            time: formatNotificationTime(roomTimestamp),
            timestamp: roomTimestamp,
            isRead: currentReadIds.includes(`notif-room-pending-${r.id}`),
            targetRoute: `/(landlord)/my-posts?status=PENDING&postId=${r.id}`,
          });
        }
      });

      // B. Thông báo từ Lịch hẹn (Chỉ lấy trong vòng 7 ngày gần nhất hoặc đang chờ xác nhận)
      appointments.forEach((a) => {
        let aptTimestamp = parseSafeDate(a.rawNgayHen);
        if (!aptTimestamp && a.ngayHen) {
          const timePart = a.thoiGian && a.thoiGian.includes(':') ? a.thoiGian.split(' ')[0] : '10:00';
          aptTimestamp = parseSafeDate(`${a.ngayHen}T${timePart}:00`);
        }
        if (!aptTimestamp) {
          aptTimestamp = now - 3600 * 1000;
        }

        const isRecentApt = now - aptTimestamp <= SEVEN_DAYS_MS || a.trangThai === 'CHO_XAC_NHAN';
        if (!isRecentApt) return;

        if (a.trangThai === 'CHO_XAC_NHAN') {
          items.push({
            id: `notif-apt-new-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Có khách đặt lịch xem phòng mới',
            message: `Khách ${a.khachHangTen} vừa hẹn xem ${a.phongTen} vào ngày ${a.ngayHen} (${a.thoiGian}).`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`notif-apt-new-${a.id}`),
            targetRoute: `/(landlord)/appointments?appointmentId=${a.id}&status=CHO_XAC_NHAN`,
          });
        } else if (a.trangThai === 'XAC_NHAN') {
          items.push({
            id: `notif-apt-confirmed-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Lịch xem phòng đã xác nhận',
            message: `Lịch hẹn xem ${a.phongTen} với khách ${a.khachHangTen} đã được bạn xác nhận.`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`notif-apt-confirmed-${a.id}`),
            targetRoute: `/(landlord)/appointments?appointmentId=${a.id}&status=XAC_NHAN`,
          });
        } else if (a.trangThai === 'HOAN_THANH') {
          items.push({
            id: `notif-apt-completed-${a.id}`,
            type: 'APPOINTMENT',
            title: 'Chốt hợp đồng thuê thành công',
            message: `Phòng ${a.phongTen} đã được cho khách ${a.khachHangTen} thuê thành công.`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`notif-apt-completed-${a.id}`),
            targetRoute: `/(landlord)/appointments?appointmentId=${a.id}&status=HOAN_THANH`,
          });
        }
      });

      // C. Thông báo từ Biến động ví / Giao dịch (Chỉ lấy trong vòng 7 ngày gần nhất)
      transactions.forEach((t) => {
        const txTimestamp = parseSafeDate(t.thoiGianTao) || parseSafeDate(t.ngayGiaoDich) || now;
        const isRecentTx = now - txTimestamp <= SEVEN_DAYS_MS;
        if (!isRecentTx) return;

        if (t.loaiGiaoDich === 'RUT_TIEN') {
          items.push({
            id: `notif-tx-withdraw-${t.id}`,
            type: 'PAYMENT',
            title: 'Yêu cầu rút tiền về ngân hàng',
            message: `Yêu cầu rút ${formatVND(t.tienCoc)} về tài khoản ngân hàng đang được xử lý.`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`notif-tx-withdraw-${t.id}`),
            targetRoute: `/(landlord)/transactions?tab=RUT_TIEN&transactionId=${t.id}`,
          });
        } else if (t.thucNhan > 0) {
          items.push({
            id: `notif-tx-${t.id}`,
            type: 'PAYMENT',
            title: 'Tiền cọc thuê phòng được cộng vào ví',
            message: `+${formatVND(t.thucNhan)} từ giao dịch thuê phòng (đã trừ ${formatVND(t.phiDichVu)} phí sàn).`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`notif-tx-${t.id}`),
            targetRoute: `/(landlord)/transactions?tab=DA_THU&transactionId=${t.id}`,
          });
        }
      });

      // 4. Sắp xếp thông báo mới nhất lên đầu
      items.sort((a, b) => b.timestamp - a.timestamp);

      const unreadCount = items.filter((x) => !x.isRead).length;

      set({
        notifications: items,
        readIds: currentReadIds,
        lastFetched: now,
        isLoading: false,
        unreadCount,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
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

      await savePersistedReadIds(updatedReadIds);
    }
  },

  markAllAsRead: async () => {
    const { notifications, readIds } = get();
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    const updatedNotifications = notifications.map((n) => ({ ...n, isRead: true }));

    set({
      readIds: allIds,
      notifications: updatedNotifications,
      unreadCount: 0,
    });

    await savePersistedReadIds(allIds);
  },
}));
