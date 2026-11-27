import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCheck,
  ChevronRight,
  Inbox,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { useAuthStore } from '@/store/useAuthStore';
import { formatRelativeTime, formatVND } from '@/utils/formatters';

type AdminNotifCategory = 'MODERATION' | 'COMPLAINT' | 'WITHDRAWAL';
type AdminNotifKind = 'ROOM' | 'LANDLORD' | 'COMPLAINT' | 'WITHDRAWAL';
type AdminNotifFilter = 'ALL' | 'UNREAD' | AdminNotifCategory;

interface AdminNotificationItem {
  id: string;
  kind: AdminNotifKind;
  category: AdminNotifCategory;
  title: string;
  content: string;
  createdAt: string;
  linkUrl: string;
}

const loadReadIds = (storageKey: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const saveReadIds = (storageKey: string, ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(ids.slice(-300)));
  } catch {
    // ignore storage quota errors
  }
};

const AdminNotificationBellInner: React.FC<{ storageKey: string }> = ({ storageKey }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<AdminNotifFilter>('ALL');
  const [readIds, setReadIds] = useState<string[]>(() => loadReadIds(storageKey));

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const {
    data: items = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'notifications-feed'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<AdminNotificationItem[]> => {
      const [roomsRes, landlordsRes, complaintsRes, transactionsRes] = await Promise.allSettled([
        adminService.getPendingRooms(),
        adminService.getLandlordRequests(),
        adminService.getAllComplaints(),
        adminService.getTransactions(),
      ]);

      const feed: AdminNotificationItem[] = [];

      if (roomsRes.status === 'fulfilled') {
        for (const r of roomsRes.value) {
          if (r.trangThai === 'CHO_DUYET') {
            feed.push({
              id: `admin-room-${r.maPhongTro}`,
              kind: 'ROOM',
              category: 'MODERATION',
              title: 'Tin đăng phòng mới chờ duyệt',
              content: `${r.tieuDe} • ${r.tenChuTro} • ${formatVND(r.giaThue)}`,
              createdAt: r.thoiGianDang || '',
              linkUrl: '/admin/posts',
            });
          }
        }
      }

      if (landlordsRes.status === 'fulfilled') {
        for (const r of landlordsRes.value) {
          if (r.trangThai === 'CHO_DUYET') {
            const reqId = r.maYeuCau || String(r.id);
            feed.push({
              id: `admin-landlord-${reqId}`,
              kind: 'LANDLORD',
              category: 'MODERATION',
              title: 'Hồ sơ CCCD Chủ trọ chờ duyệt',
              content: `${r.hoVaTen} (${r.email}) gửi yêu cầu nâng cấp Chủ trọ`,
              createdAt: r.ngayGui || '',
              linkUrl: '/admin/users',
            });
          }
        }
      }

      if (complaintsRes.status === 'fulfilled') {
        for (const c of complaintsRes.value) {
          if (c.trangThai === 'CHO_DUYET') {
            feed.push({
              id: `admin-complaint-${c.maKhieuNai}`,
              kind: 'COMPLAINT',
              category: 'COMPLAINT',
              title: 'Khiếu nại mới cần xử lý',
              content: `${c.nguoiKhieuNai} phản ánh ${c.doiTuongBiKhieuNai}: ${c.vanDe}`,
              createdAt: c.thoiGian || '',
              linkUrl: '/admin/complaints',
            });
          }
        }
      }

      if (transactionsRes.status === 'fulfilled') {
        for (const t of transactionsRes.value) {
          const isWithdrawal =
            t.loaiGiaoDich === 'RUT_TIEN' || t.loaiGiaoDich === 'YEU_CAU_RUT_TIEN';
          if (isWithdrawal && t.trangThai === 'CHO_THANH_TOAN') {
            feed.push({
              id: `admin-withdraw-${t.maGiaoDich}`,
              kind: 'WITHDRAWAL',
              category: 'WITHDRAWAL',
              title: 'Lệnh rút tiền chờ phê duyệt',
              content: `${t.nguoiThucHien} yêu cầu rút ${formatVND(t.soTien)}${t.tenNganHang ? ` (${t.tenNganHang})` : ''}`,
              createdAt: t.thoiGian || '',
              linkUrl: '/admin/transactions',
            });
          }
        }
      }

      return feed.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    },
  });

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const unreadCount = useMemo(
    () => items.filter((item) => !readSet.has(item.id)).length,
    [items, readSet],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === 'UNREAD') return !readSet.has(item.id);
      if (filter === 'ALL') return true;
      return item.category === filter;
    });
  }, [items, filter, readSet]);

  const markAsRead = (id: string) => {
    if (readSet.has(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    saveReadIds(storageKey, next);
  };

  const handleMarkAllRead = () => {
    if (items.length === 0) return;
    const merged = Array.from(new Set([...readIds, ...items.map((item) => item.id)]));
    setReadIds(merged);
    saveReadIds(storageKey, merged);
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleItemClick = (item: AdminNotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    navigate(item.linkUrl);
  };

  const renderKindIcon = (kind: AdminNotifKind) => {
    switch (kind) {
      case 'ROOM':
        return (
          <div className="w-9 h-9 rounded-[var(--radius-control)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
        );
      case 'LANDLORD':
        return (
          <div className="w-9 h-9 rounded-[var(--radius-control)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
      case 'COMPLAINT':
        return (
          <div className="w-9 h-9 rounded-[var(--radius-control)] bg-danger-bg text-danger-text flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'WITHDRAWAL':
        return (
          <div className="w-9 h-9 rounded-[var(--radius-control)] bg-warning-bg text-warning-text flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        title="Thông báo Quản trị"
        aria-label="Thông báo Quản trị"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'admin-notifications-popover' : undefined}
        className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center text-text-secondary hover:text-text hover:bg-surface-muted transition-colors relative cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger-text text-white text-[10px] font-semibold flex items-center justify-center leading-none tabular-nums">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="admin-notifications-popover"
          role="region"
          aria-label="Thông báo Quản trị"
          className="absolute right-0 top-full mt-2.5 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-surface rounded-[var(--radius-modal)] shadow-[var(--shadow-modal)] border border-border overflow-hidden flex flex-col max-h-[min(520px,calc(100dvh-6rem))]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border bg-surface-subtle flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[var(--radius-control)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-text">Thông báo Quản trị</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-[var(--radius-badge)] text-[11px] font-medium bg-danger-bg text-danger-text tabular-nums">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">Hàng đợi cần xử lý theo thời gian thực</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                title="Làm mới thông báo"
                aria-label="Làm mới thông báo"
                className="p-1.5 rounded-[var(--radius-control)] text-text-muted hover:text-text hover:bg-surface-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả đã đọc"
                  className="px-2 py-1 rounded-[var(--radius-control)] text-xs font-medium text-accent hover:bg-accent-soft flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Đọc tất cả
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-border flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 bg-surface">
            <div className="inline-flex items-center gap-1 rounded-[10px] bg-surface-muted p-[3px]">
              {(
                [
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'UNREAD', label: 'Chưa đọc' },
                  { key: 'MODERATION', label: 'Kiểm duyệt' },
                  { key: 'COMPLAINT', label: 'Khiếu nại' },
                  { key: 'WITHDRAWAL', label: 'Rút tiền' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-[var(--radius-control)] text-xs whitespace-nowrap transition-colors cursor-pointer ${
                    filter === tab.key
                      ? 'bg-surface text-text font-semibold shadow-[var(--shadow-tab-active)]'
                      : 'text-text-muted font-medium hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1 divide-y divide-surface-muted">
            {isLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[var(--radius-control)] bg-surface-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-2/3 bg-surface-muted rounded" />
                      <div className="h-3 w-full bg-surface-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isUnread = !readSet.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3.5 hover:bg-surface-subtle transition-colors flex items-start gap-3 cursor-pointer ${
                      isUnread ? 'bg-accent-soft/45' : 'bg-surface'
                    }`}
                  >
                    {renderKindIcon(item.kind)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs leading-snug ${
                            isUnread ? 'font-semibold text-text' : 'font-medium text-text-secondary'
                          }`}
                        >
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                        {item.content}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-xs text-text-muted">
                        <span>{item.createdAt ? formatRelativeTime(item.createdAt) : 'Đang chờ'}</span>
                        <span className="text-accent font-medium inline-flex items-center gap-0.5">
                          Xử lý ngay
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-6 text-center">
                <div className="w-11 h-11 rounded-[var(--radius-card)] bg-surface-muted text-text-muted flex items-center justify-center mx-auto mb-2.5">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-text-secondary">
                  Mọi hàng đợi đều đã được xử lý
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Chưa có tin duyệt, khiếu nại hay lệnh rút tiền nào đang chờ.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminNotificationBell: React.FC = () => {
  const userId = useAuthStore((s) => s.user?.maNguoiDung || 'admin');
  const storageKey = `innfinder-admin-notif-read-${userId}`;
  return <AdminNotificationBellInner key={storageKey} storageKey={storageKey} />;
};
