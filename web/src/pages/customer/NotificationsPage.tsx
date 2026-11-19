import React, { useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/common/AppButton';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer, PageHeader } from '@/components/common/PageContainer';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { NotificationItem } from '@/types/auth-user.types';
import { formatDateTime } from '@/utils/formatters';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

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
        return <Calendar className="w-5 h-5 text-teal-600" />;
      case 'TRANSACTION':
        return <ArrowRightLeft className="w-5 h-5 text-emerald-600" />;
      case 'COMPLAINT':
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBadgeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'TRANSACTION':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'COMPLAINT':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
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
    <PageContainer width="narrow" className="space-y-6">
      <PageHeader
        title="Trung tâm thông báo"
        subtitle="Theo dõi tiến độ xem phòng, cập nhật giao dịch cọc và thông báo từ hệ thống"
        action={
          <div className="flex items-center gap-2">
            <AppButton
              variant="secondary"
              size="md"
              onClick={() => void fetchNotifications(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </AppButton>
            {unreadCount > 0 && (
              <AppButton
                variant="primary"
                size="md"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-4 h-4" />
                <span>Đã đọc tất cả ({unreadCount})</span>
              </AppButton>
            )}
          </div>
        }
      />

      {/* Shopee-style filter tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'UNREAD', label: `Chưa đọc (${unreadCount})` },
          { key: 'APPOINTMENT', label: 'Lịch xem phòng' },
          { key: 'TRANSACTION', label: 'Giao dịch cọc' },
          { key: 'SYSTEM', label: 'Hệ thống & Khiếu nại' },
        ].map((tab) => {
          const isActive = filterType === tab.key;
          return (
            <button
              type="button"
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                notif.read
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  : 'bg-teal-50/40 border-teal-200 shadow-xs ring-1 ring-teal-200/50'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${getBadgeColor(
                  notif.type,
                )}`}
              >
                {getIconForType(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4
                    className={`text-sm font-bold truncate ${
                      notif.read ? 'text-slate-900' : 'text-teal-950'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(notif.createdAt)}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
                  {notif.content}
                </p>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(
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
                    <span className="text-xs text-teal-700 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
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
            action={
              filterType !== 'ALL' ? (
                <AppButton variant="secondary" size="md" onClick={() => setFilterType('ALL')}>
                  Xem tất cả thông báo
                </AppButton>
              ) : undefined
            }
          />
        )}
      </div>
    </PageContainer>
  );
};

export default NotificationsPage;
