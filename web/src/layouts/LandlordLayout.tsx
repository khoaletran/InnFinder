import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RouteLoadingOverlay } from '@/components/common/RouteLoadingOverlay';
import { LandlordHeader } from '@/components/landlord/LandlordHeader';
import { LandlordSidebar } from '@/components/landlord/LandlordSidebar';

export const LandlordLayout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/rooms/create')) {
      return { title: 'Đăng Phòng Trọ Mới', subtitle: 'Tạo bài đăng cho thuê mới trên sàn (5 bước)' };
    }
    if (pathname.includes('/rooms/edit')) {
      return { title: 'Chỉnh Sửa Phòng Trọ', subtitle: 'Cập nhật nội dung bài đăng phòng' };
    }
    if (pathname.includes('/rooms')) {
      return { title: 'Quản Lý Phòng Trọ', subtitle: 'Danh sách và trạng thái các phòng đang quản lý' };
    }
    if (pathname.includes('/appointments')) {
      return { title: 'Lịch Hẹn Xem Phòng', subtitle: 'Danh sách phiếu đặt lịch hẹn và đối soát cọc thế chân' };
    }
    if (pathname.includes('/wallet')) {
      return { title: 'Ví & Quản Lý Dòng Tiền', subtitle: 'Quản lý số dư khả dụng, tiền cọc thế chân và rút về ngân hàng' };
    }
    if (pathname.includes('/reviews')) {
      return { title: 'Đánh Giá & Khiếu Nại', subtitle: 'Ý kiến phản hồi từ khách hàng và biên bản xử lý khiếu nại' };
    }
    return { title: 'Tổng Quan Chủ Trọ', subtitle: 'Báo cáo chỉ số hoạt động thực tế của chủ trọ' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans">
      <LandlordSidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <LandlordHeader title={title} subtitle={subtitle} />
        <main className="relative flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
          <RouteLoadingOverlay />
        </main>
      </div>
    </div>
  );
};
