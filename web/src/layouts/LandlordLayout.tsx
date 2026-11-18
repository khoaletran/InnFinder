import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';

export const LandlordLayout: React.FC = () => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/rooms/create')) {
      return { title: 'Đăng Phòng Trọ Mới', subtitle: 'Tạo bài đăng cho thuê mới trên sàn' };
    }
    if (pathname.includes('/rooms/edit')) {
      return { title: 'Chỉnh Sửa Phòng Trọ', subtitle: 'Cập nhật nội dung bài đăng phòng' };
    }
    if (pathname.includes('/rooms')) {
      return { title: 'Quản Lý Phòng Trọ', subtitle: 'Danh sách và trạng thái các phòng đang quản lý' };
    }
    if (pathname.includes('/appointments')) {
      return { title: 'Lịch Hẹn Xem Phòng', subtitle: 'Danh sách phiếu đặt lịch hẹn và xử lý cọc' };
    }
    if (pathname.includes('/wallet')) {
      return { title: 'Ví & Quản Lý Doanh Thu', subtitle: 'Quản lý số dư, tiền cọc và rút về ngân hàng' };
    }
    if (pathname.includes('/reviews')) {
      return { title: 'Đánh Giá & Khiếu Nại', subtitle: 'Ý kiến phản hồi từ khách hàng và xử lý khiếu nại' };
    }
    return { title: 'Tổng Quan Hệ Thống', subtitle: 'Báo cáo chỉ số hoạt động của chủ trọ' };
  };

  const { title, subtitle } = getPageTitle(location.pathname);

  return (
    <div className="flex min-h-screen bg-slate-50/60 font-sans">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
