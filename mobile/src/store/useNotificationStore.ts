import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { bookingService } from '../services/booking.service';
import { useAuthStore } from './useAuthStore';
import { formatVND } from '../utils/formatVND';

export type TenantNotificationType =
  | 'APPOINTMENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT'
  | 'REMINDER';

export interface TenantNotificationItem {
  id: string;
  type: TenantNotificationType;
  title: string;
  message: string;
  time: string;
  timestamp: number;
  isRead: boolean;
  targetRoute: string;
}

interface TenantNotificationState {
  currentUserId?: string;
  notifications: TenantNotificationItem[];
  readIds: string[];
  lastFetched: number;
  isLoading: boolean;
  unreadCount: number;

  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  // Giữ tương thích ngược với các component cũ
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
}

const CACHE_TTL_MS = 60 * 1000; // 60 giây cache hạn dòng (không gọi mạng liên tục)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // Giới hạn thông báo sự kiện trong 7 ngày
const REVIEWED_STORAGE_KEY = 'innfinder_reviewed_room_ids';

/**
 * Lấy storage key gắn theo mã người dùng Khách thuê để lưu bền vững
 */
const getStorageKey = () => {
  const user = useAuthStore.getState().user;
  const userId = user?.maNguoiDung || 'guest_tenant';
  return `innfinder_tenant_read_notifs_${userId}`;
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
    console.warn('Lỗi đọc tenant readIds từ SecureStore:', e);
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
    console.warn('Lỗi lưu tenant readIds vào SecureStore:', e);
  }
};

/**
 * Parse chuỗi ngày an toàn sang timestamp (ms)
 */
function parseSafeDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  if (!isNaN(parsed) && parsed > 0) return parsed;

  const parts = dateStr.split(/[-/T :]/);
  if (parts.length >= 3) {
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
 * Định dạng thời gian thông báo thân thiện (giờ:phút, ngày/tháng)
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

export const useNotificationStore = create<TenantNotificationState>((set, get) => ({
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
      // 2. Nạp danh sách đã đọc từ SecureStore theo định danh người dùng Tenant hiện tại
      const user = useAuthStore.getState().user;
      const currentUserId = user?.maNguoiDung || 'guest_tenant';
      let currentReadIds = get().readIds;

      if (get().currentUserId !== currentUserId) {
        currentReadIds = await loadPersistedReadIds();
        set({ currentUserId, readIds: currentReadIds });
      } else if (currentReadIds.length === 0) {
        currentReadIds = await loadPersistedReadIds();
        set({ readIds: currentReadIds });
      }

      // 3. Tải song song dữ liệu Lịch hẹn của Tenant và Lịch sử Giao dịch
      const [appointments, transactions, rawReviewed] = await Promise.all([
        bookingService.getMyAppointments().catch(() => []),
        bookingService.getMyTransactions().catch(() => []),
        SecureStore.getItemAsync(REVIEWED_STORAGE_KEY).catch(() => null),
      ]);

      const reviewedRoomIds: string[] = rawReviewed ? JSON.parse(rawReviewed) : [];
      const items: TenantNotificationItem[] = [];

      // A. Thông báo từ Lịch hẹn xem phòng (Góc nhìn Khách thuê)
      (appointments || []).forEach((a) => {
        const aptTimestamp = parseSafeDate(a.ngayHen) || (now - 3600 * 1000);
        const isRecentApt =
          now - aptTimestamp <= SEVEN_DAYS_MS ||
          a.trangThai === 'CHO_XAC_NHAN' ||
          a.trangThai === 'XAC_NHAN';

        if (!isRecentApt) return;

        const roomTitle = a.tieuDePhong || a.diaChiPhong || 'phòng trọ';

        if (a.trangThai === 'CHO_XAC_NHAN') {
          items.push({
            id: `tenant-notif-apt-pending-${a.maDatLich}`,
            type: 'APPOINTMENT',
            title: 'Đã gửi yêu cầu đặt lịch xem phòng',
            message: `Lịch hẹn xem ${roomTitle} đang chờ chủ trọ xác nhận.`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-apt-pending-${a.maDatLich}`),
            targetRoute: `/(tenant)/appointments?tab=CHO_XAC_NHAN`,
          });
        } else if (a.trangThai === 'XAC_NHAN') {
          if (!a.daNopCoc) {
            items.push({
              id: `tenant-notif-apt-need-deposit-${a.maDatLich}`,
              type: 'APPOINTMENT',
              title: 'Lịch xem phòng đã xác nhận',
              message: `Chủ trọ đã duyệt lịch xem ${roomTitle}. Vui lòng nộp cọc giữ chân để hoàn tất hẹn.`,
              time: formatNotificationTime(aptTimestamp),
              timestamp: aptTimestamp,
              isRead: currentReadIds.includes(`tenant-notif-apt-need-deposit-${a.maDatLich}`),
              targetRoute: `/booking/deposit-payment?appointmentId=${a.maDatLich}`,
            });
          } else {
            items.push({
              id: `tenant-notif-apt-ready-${a.maDatLich}`,
              type: 'APPOINTMENT',
              title: 'Lịch xem phòng đã sẵn sàng',
              message: `Bạn đã nộp cọc giữ chân cho ${roomTitle}. Hãy đến xem phòng đúng giờ hẹn nhé!`,
              time: formatNotificationTime(aptTimestamp),
              timestamp: aptTimestamp,
              isRead: currentReadIds.includes(`tenant-notif-apt-ready-${a.maDatLich}`),
              targetRoute: `/booking/rental-detail?id=${a.maDatLich}`,
            });
          }
        } else if (a.trangThai === 'HOAN_THANH') {
          items.push({
            id: `tenant-notif-apt-completed-${a.maDatLich}`,
            type: 'COMPLETED',
            title: 'Chốt hợp đồng thuê thành công',
            message: `Chúc mừng bạn đã chốt thuê ${roomTitle}. Tiền cọc giữ chân đã được hoàn về ví.`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-apt-completed-${a.maDatLich}`),
            targetRoute: `/booking/rental-detail?id=${a.maDatLich}`,
          });

          // Nhắc nhở đánh giá phòng nếu chưa đánh giá
          if (a.maPhongTro && !reviewedRoomIds.includes(a.maPhongTro)) {
            items.push({
              id: `tenant-notif-review-prompt-${a.maDatLich}`,
              type: 'REMINDER',
              title: 'Đánh giá phòng đã xem',
              message: `Bạn thấy ${roomTitle} thế nào? Hãy chia sẻ đánh giá thực tế của bạn nhé!`,
              time: formatNotificationTime(aptTimestamp + 1000),
              timestamp: aptTimestamp + 1000,
              isRead: currentReadIds.includes(`tenant-notif-review-prompt-${a.maDatLich}`),
              targetRoute: `/booking/review?roomId=${a.maPhongTro}&appointmentId=${a.maDatLich}`,
            });
          }
        } else if (a.trangThai === 'HUY') {
          items.push({
            id: `tenant-notif-apt-cancelled-${a.maDatLich}`,
            type: 'CANCELLED',
            title: 'Lịch hẹn xem phòng đã bị hủy',
            message: `Lịch hẹn xem ${roomTitle} đã bị hủy${a.liDoHuy ? `: ${a.liDoHuy}` : ''}. Tiền cọc (nếu có) đã hoàn về ví.`,
            time: formatNotificationTime(aptTimestamp),
            timestamp: aptTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-apt-cancelled-${a.maDatLich}`),
            targetRoute: `/(tenant)/appointments?tab=HUY`,
          });
        }
      });

      // B. Thông báo từ Biến động Ví & Giao dịch của Tenant
      (transactions || []).forEach((t) => {
        const txTimestamp = parseSafeDate(t.ngayGiaoDich) || now;
        const isRecentTx = now - txTimestamp <= SEVEN_DAYS_MS;
        if (!isRecentTx) return;

        if (t.loaiGiaoDich === 'COC_GIU_CHO') {
          items.push({
            id: `tenant-notif-tx-deposit-${t.maGiaoDich}`,
            type: 'PAYMENT',
            title: 'Nộp tiền cọc xem phòng',
            message: `-${formatVND(t.soTien)} tiền cọc giữ chân lịch xem phòng đã được tạm giữ an toàn.`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-tx-deposit-${t.maGiaoDich}`),
            targetRoute: `/booking/transactions`,
          });
        } else if (t.loaiGiaoDich === 'HOAN_COC') {
          items.push({
            id: `tenant-notif-tx-refund-${t.maGiaoDich}`,
            type: 'PAYMENT',
            title: 'Hoàn tiền cọc xem phòng',
            message: `+${formatVND(t.soTien)} cọc giữ chân đã được hoàn trả nguyên vẹn về ví của bạn.`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-tx-refund-${t.maGiaoDich}`),
            targetRoute: `/booking/transactions`,
          });
        } else if (t.loaiGiaoDich === 'NAP_TIEN') {
          items.push({
            id: `tenant-notif-tx-topup-${t.maGiaoDich}`,
            type: 'PAYMENT',
            title: 'Nạp tiền vào ví thành công',
            message: `+${formatVND(t.soTien)} đã được cộng vào số dư ví khả dụng của bạn.`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-tx-topup-${t.maGiaoDich}`),
            targetRoute: `/booking/transactions`,
          });
        } else if (t.loaiGiaoDich === 'RUT_TIEN') {
          items.push({
            id: `tenant-notif-tx-withdraw-${t.maGiaoDich}`,
            type: 'PAYMENT',
            title: 'Yêu cầu rút tiền về ngân hàng',
            message: `Yêu cầu rút ${formatVND(t.soTien)} về tài khoản ngân hàng đang được xử lý.`,
            time: formatNotificationTime(txTimestamp),
            timestamp: txTimestamp,
            isRead: currentReadIds.includes(`tenant-notif-tx-withdraw-${t.maGiaoDich}`),
            targetRoute: `/booking/transactions`,
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

  // Tương thích ngược
  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
}));
