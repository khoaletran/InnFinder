import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { Outlet, useLocation } from 'react-router-dom';
import { LandlordHeader } from '@/components/landlord/LandlordHeader';
import { LandlordSidebar } from '@/components/landlord/LandlordSidebar';

const LandlordContent: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/rooms/create')) {
      return { title: 'Đăng Phòng Trọ Mới' };
    }
    if (pathname.includes('/rooms/edit')) {
      return { title: 'Chỉnh Sửa Phòng Trọ' };
    }
    if (pathname.includes('/rooms')) {
      return { title: 'Quản Lý Phòng Trọ' };
    }
    if (pathname.includes('/appointments')) {
      return { title: 'Lịch Hẹn Xem Phòng' };
    }
    if (pathname.includes('/wallet')) {
      return { title: 'Ví & Quản Lý Dòng Tiền' };
    }
    if (pathname.includes('/reviews')) {
      return { title: 'Đánh Giá & Khiếu Nại' };
    }
    if (pathname.includes('/profile')) {
      return { title: 'Hồ Sơ Chủ Trọ' };
    }
    return { title: 'Tổng Quan Chủ Trọ' };
  };

  const { title } = getPageTitle(location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans">
      <LandlordSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LandlordHeader title={title} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function LandlordSession() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    staleTime: 15000, refetchOnWindowFocus: true, retry: 1,
  } } }));
  return <QueryClientProvider client={client}><LandlordContent /></QueryClientProvider>;
}

export const LandlordLayout: React.FC = () => {
  const userId = useAuthStore((state) => state.user?.maNguoiDung);
  const token = useAuthStore((state) => state.token);
  return <LandlordSession key={`${userId}:${token}`} />;
};
