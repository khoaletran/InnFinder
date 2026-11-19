import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Calendar,
  CheckCheck,
  Info,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { NotificationItem } from '@/types/auth-user.types';
import { formatRelativeTime } from '@/utils/formatters';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'ALL' | 'UNREAD' | 'APPOINTMENT' | 'TRANSACTION';

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'UNREAD') return !n.read;
    if (activeTab === 'APPOINTMENT') return n.type === 'APPOINTMENT';
    if (activeTab === 'TRANSACTION') return n.type === 'TRANSACTION';
    return true;
  });

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return <Calendar className="w-4 h-4 text-teal-600" />;
      case 'TRANSACTION':
        return <ArrowRightLeft className="w-4 h-4 text-emerald-600" />;
      case 'COMPLAINT':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBgColorForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'APPOINTMENT':
        return 'bg-teal-50 border-teal-200';
      case 'TRANSACTION':
        return 'bg-emerald-50 border-emerald-200';
      case 'COMPLAINT':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const handleItemClick = (notif: NotificationItem) => {
    markAsRead(notif.id);
    onClose();
    if (notif.linkUrl) {
      const normalized = notif.linkUrl.startsWith('/customer/')
        ? notif.linkUrl.replace('/customer/', '/')
        : notif.linkUrl;
      navigate(normalized);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden"
        onClick={onClose}
      />

      {/* Floating Popup Modal (Desktop aligned to bell, mobile centered) */}
      <div
        ref={modalRef}
        className="fixed sm:absolute top-16 sm:top-12 left-3 right-3 sm:left-auto sm:right-0 sm:w-[420px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-2xs">
                    {unreadCount} mới
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Cập nhật lịch hẹn &amp; biến động cọc</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Đóng bảng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
          {[
            { key: 'ALL' as FilterTab, label: 'Tất cả' },
            { key: 'UNREAD' as FilterTab, label: `Chưa đọc (${unreadCount})` },
            { key: 'APPOINTMENT' as FilterTab, label: 'Lịch hẹn' },
            { key: 'TRANSACTION' as FilterTab, label: 'Giao dịch' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full p-4 flex items-start gap-3.5 text-left transition-colors cursor-pointer group ${
                  !item.read
                    ? 'bg-teal-50/30 hover:bg-teal-50/60'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${getBgColorForType(
                    item.type,
                  )}`}
                >
                  {getIconForType(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`text-sm truncate leading-snug group-hover:text-teal-800 transition-colors ${
                        !item.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                      }`}
                    >
                      {item.title}
                    </h4>
                    {!item.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                    {item.content}
                  </p>
                  <span className="text-xs text-slate-500 mt-1.5 block font-medium">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Không có thông báo nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Bạn đã cập nhật tất cả thông báo mới nhất
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <Link
            to="/notifications"
            onClick={onClose}
            className="w-full h-10 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-teal-700 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs"
          >
            <span>Xem tất cả thông báo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
};
