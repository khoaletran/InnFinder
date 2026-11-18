import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { NotificationItem } from '@/types/auth-user.types';
import { formatDateTime } from '@/utils/formatters';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredNotifications = notifications.filter((item) => {
    if (filterType === 'UNREAD') return !item.read;
    if (filterType === 'APPOINTMENT') return item.type === 'APPOINTMENT';
    if (filterType === 'TRANSACTION') return item.type === 'TRANSACTION';
    if (filterType === 'SYSTEM') return item.type === 'SYSTEM' || item.type === 'COMPLAINT';
    return true;
  });

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'TRANSACTION':
        return <ArrowRightLeft className="w-4 h-4 text-emerald-600" />;
      case 'COMPLAINT':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getBadgeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'TRANSACTION':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPLAINT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    if (notif.linkUrl) {
      const normalized = notif.linkUrl.startsWith('/customer/')
        ? notif.linkUrl.replace('/customer/', '/')
        : notif.linkUrl;
      navigate(normalized);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Trung tâm thông báo</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ xem phòng, cập nhật giao dịch cọc và thông báo từ hệ thống
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'ALL', label: 'Tất cả thông báo' },
          { key: 'UNREAD', label: `Chưa đọc (${unreadCount})` },
          { key: 'APPOINTMENT', label: 'Lịch xem phòng' },
          { key: 'TRANSACTION', label: 'Giao dịch cọc' },
          { key: 'SYSTEM', label: 'Hệ thống & Khiếu nại' },
        ].map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterType === tab.key
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                notif.read
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-blue-50/40 border-blue-200 shadow-2xs'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeColor(
                  notif.type,
                )}`}
              >
                {getIconForType(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4
                    className={`text-xs font-bold truncate ${
                      notif.read ? 'text-slate-800' : 'text-blue-900'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(notif.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-2">{notif.content}</p>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeColor(
                      notif.type,
                    )}`}
                  >
                    {notif.type === 'APPOINTMENT'
                      ? 'Lịch hẹn'
                      : notif.type === 'TRANSACTION'
                        ? 'Giao dịch'
                        : 'Hệ thống'}
                  </span>

                  {!notif.read && (
                    <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      Mới
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="Không có thông báo nào"
            description="Bạn đã xem hết các thông báo trong danh mục này."
            icon={<Bell className="w-7 h-7" />}
          />
        )}
      </div>
    </div>
  );
};
