import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface AppBreadcrumbProps {
  items?: BreadcrumbItem[];
  fullWidth?: boolean;
  className?: string;
}

function resolveRouteBreadcrumb(pathname: string): BreadcrumbItem[] | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return null;

  if (path === '/search/map') {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Tìm kiếm phòng', to: '/search' },
      { label: 'Tìm trên bản đồ' },
    ];
  }
  if (path === '/search') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Tìm kiếm phòng' }];
  }
  if (path === '/favorites') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Phòng yêu thích' }];
  }
  if (path === '/appointments') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Lịch xem phòng' }];
  }
  if (path.startsWith('/appointments/schedule') || path.startsWith('/booking/schedule')) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch xem phòng', to: '/appointments' },
      { label: 'Đặt lịch xem phòng' },
    ];
  }
  if (path.startsWith('/appointments/deposit/') || path.startsWith('/booking/deposit/')) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch xem phòng', to: '/appointments' },
      { label: 'Thanh toán cọc' },
    ];
  }
  if (/^\/appointments\/[^/]+\/roommates$/.test(path)) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch xem phòng', to: '/appointments' },
      { label: 'Đăng bài ở ghép' },
    ];
  }
  if (path === '/roommates') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Ở ghép' }];
  }
  if (path.startsWith('/roommates/')) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Ở ghép', to: '/roommates' },
      { label: 'Chi tiết bài ở ghép' },
    ];
  }
  if (
    path.startsWith('/appointments/') ||
    path.startsWith('/booking/rental/') ||
    path.startsWith('/rentals/')
  ) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch xem phòng', to: '/appointments' },
      { label: 'Chi tiết lịch hẹn' },
    ];
  }
  if (path === '/transactions') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Lịch sử giao dịch' }];
  }
  if (path.startsWith('/transactions/')) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch sử giao dịch', to: '/transactions' },
      { label: 'Chi tiết giao dịch' },
    ];
  }
  if (path === '/wallet') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Ví của tôi' }];
  }
  if (path === '/profile') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Hồ sơ cá nhân' }];
  }
  if (path === '/notifications') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Thông báo' }];
  }
  if (path === '/complaints') {
    return [{ label: 'Trang chủ', to: '/' }, { label: 'Khiếu nại & Hỗ trợ' }];
  }
  if (path.startsWith('/reviews/create/') || path.startsWith('/booking/review/')) {
    return [
      { label: 'Trang chủ', to: '/' },
      { label: 'Lịch xem phòng', to: '/appointments' },
      { label: 'Đánh giá phòng' },
    ];
  }
  return null;
}

export const AppBreadcrumb: React.FC<AppBreadcrumbProps> = ({
  items,
  fullWidth = false,
  className = '',
}) => {
  const location = useLocation();

  const resolvedItems = items ?? resolveRouteBreadcrumb(location.pathname);
  if (!resolvedItems || resolvedItems.length === 0) return null;

  return (
    <div
      className={`bg-white/95 backdrop-blur-md border-b border-slate-200/80 shrink-0 sticky top-16 z-[35] ${className}`.trim()}
    >
      <div
        className={`${
          fullWidth ? 'w-full px-4 sm:px-6' : 'max-w-[1200px] w-full mx-auto px-4 sm:px-6'
        } h-9 flex items-center text-xs font-medium text-slate-500 min-w-0`}
      >

        <nav aria-label="Đường dẫn trang" className="flex items-center gap-2 min-w-0 overflow-hidden">
          {resolvedItems.map((item, idx) => {
            const isLast = idx === resolvedItems.length - 1;
            return (
              <React.Fragment key={`${item.label}-${idx}`}>
                {idx > 0 && <span className="text-slate-400 shrink-0">/</span>}
                {item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="hover:text-teal-700 transition-colors shrink-0 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-slate-900 font-semibold truncate">{item.label}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
