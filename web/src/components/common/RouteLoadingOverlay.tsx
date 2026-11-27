import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { MapJourneyLoader } from './MapJourneyLoader';

interface RouteLoadingOverlayProps {
  message?: string;
}

const ROUTE_SETTLE_GRACE_MS = 120;
const SAFETY_READY_TIMEOUT_MS = 10000;
const FADE_OUT_MS = 220;

const RouteLoadingSession: React.FC<{ message?: string }> = ({ message }) => {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(true);
  const [gracePassed, setGracePassed] = useState(false);
  const [forcedReady, setForcedReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const graceTimer = window.setTimeout(() => {
      setGracePassed(true);
    }, ROUTE_SETTLE_GRACE_MS);

    const safetyTimer = window.setTimeout(() => {
      setForcedReady(true);
    }, SAFETY_READY_TIMEOUT_MS);

    return () => {
      window.clearTimeout(graceTimer);
      window.clearTimeout(safetyTimer);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  const isDataReady = forcedReady || (gracePassed && isFetching === 0);

  const handleComplete = useCallback(() => {
    setIsFadingOut(true);
    fadeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setIsFadingOut(false);
    }, FADE_OUT_MS);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-30 bg-bg/65 backdrop-blur-sm flex items-start justify-center pt-12 sm:pt-20 transition-opacity duration-150 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="sticky top-24 w-full flex justify-center">
        <MapJourneyLoader
          isDataReady={isDataReady}
          onComplete={handleComplete}
          message={message}
        />
      </div>
    </div>
  );
};

const HEAVY_ROUTE_MESSAGES: Array<{ match: (path: string) => boolean; message: string }> = [
  // Admin Console — các trang tổng hợp đa bảng / sổ cái / dữ liệu lớn
  { match: (p) => p === '/admin/dashboard', message: 'Đang tải tổng quan quản trị & ngân khố...' },
  { match: (p) => p === '/admin/statistics', message: 'Đang tổng hợp dữ liệu thống kê sàn...' },
  { match: (p) => p === '/admin/posts', message: 'Đang tải danh sách bài đăng phòng trọ...' },
  { match: (p) => p.startsWith('/admin/users'), message: 'Đang tải dữ liệu người dùng & hồ sơ...' },
  { match: (p) => p === '/admin/transactions', message: 'Đang tải sổ cái giao dịch & ngân khố...' },

  // Landlord Portal — các trang tổng hợp nhiều nguồn / biểu đồ phân tích
  { match: (p) => p === '/landlord/dashboard', message: 'Đang tải bảng điều khiển chủ trọ...' },
  { match: (p) => p === '/landlord/statistics', message: 'Đang phân tích hiệu quả & dòng tiền...' },

  // Customer Portal — các trang bản đồ nặng hoặc đọc RTDB
  { match: (p) => p === '/search/map', message: 'Đang tải bản đồ & vị trí phòng trọ...' },
  { match: (p) => p.startsWith('/roommates'), message: 'Đang tải dữ liệu ở ghép...' },
];

export function resolveHeavyRouteMessage(pathname: string): string | null {
  const found = HEAVY_ROUTE_MESSAGES.find((entry) => entry.match(pathname));
  return found ? found.message : null;
}

export const RouteLoadingOverlay: React.FC<RouteLoadingOverlayProps> = ({
  message,
}) => {
  const location = useLocation();
  const routeMessage = resolveHeavyRouteMessage(location.pathname);
  if (!routeMessage) return null;
  return <RouteLoadingSession key={location.pathname} message={message ?? routeMessage} />;
};
