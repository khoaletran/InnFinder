import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCheck,
  CalendarCheck,
  Wallet,
  ShieldAlert,
  Home,
  Clock,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { useLandlordNotifications } from './useLandlordNotifications';
import type { NotificationItem } from '@/types/auth-user.types';
import { toast } from 'sonner';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, error, refetch } = useLandlordNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return <CalendarCheck className="w-4 h-4 text-cyan-600" />;
      case 'TRANSACTION':
        return <Wallet className="w-4 h-4 text-emerald-600" />;
      case 'COMPLAINT':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'POST':
        return <Home className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
    }
  };

  const getTargetUrl = (item: NotificationItem): string => {
    if (item.linkUrl?.startsWith('/landlord')) return item.linkUrl;
    switch (item.type) {
      case 'APPOINTMENT':
        return '/landlord/appointments';
      case 'TRANSACTION':
        return '/landlord/wallet';
      case 'COMPLAINT':
        return '/landlord/reviews';
      case 'POST':
        return '/landlord/rooms';
      default:
        return '/landlord/dashboard';
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    const target = getTargetUrl(item);
    onClose();
    navigate(target);
  };

  const handleMarkAll = () => {
    markAllAsRead();
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <div
      id="landlord-notifications"
      role="region"
      aria-label="Thông báo chủ trọ"
      className="absolute right-0 top-full mt-3 z-50 w-[400px] max-w-[calc(100vw-2rem)]"
    >
      <div
        className="w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[min(520px,calc(100dvh-6rem))]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Thông Báo Chủ Trọ</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500 text-white">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Cập nhật lịch xem, cọc thế chân và tin đăng</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông báo"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar & Actions */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-white shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {error && <div role="alert" className="p-4 text-xs text-red-600">Không tải được thông báo. <button onClick={() => void refetch()} className="underline">Thử lại</button></div>}
        {isLoading && <p className="p-4 text-xs text-slate-500">Đang tải thông báo...</p>}
        {/* Notification List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
          {filteredList.length === 0 ? (
            <div className="py-10 text-center px-6">
              <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Không có thông báo nào</p>
              <p className="text-xs text-slate-400 mt-1">
                {filter === 'unread'
                  ? 'Bạn đã đọc toàn bộ các thông báo mới'
                  : 'Các cập nhật về lịch hẹn và ví sẽ hiển thị tại đây'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer hover:bg-slate-50/80 ${
                  !item.read ? 'bg-cyan-50/30' : 'bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    !item.read ? 'bg-white shadow-xs border border-cyan-100' : 'bg-slate-100'
                  }`}
                >
                  {getNotificationIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs truncate ${
                        !item.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                      }`}
                    >
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {!item.read ? (
                  <span className="w-2 h-2 rounded-full bg-cyan-600 shrink-0 self-center" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <span>Nhấn vào thông báo để chuyển đến trang chi tiết</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
