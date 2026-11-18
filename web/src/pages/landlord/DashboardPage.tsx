import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Home,
  CalendarCheck,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Clock,
  MapPin,
} from 'lucide-react';
import { landlordService } from '../../services/landlord.service';
import type {
  LandlordDashboardStats,
  LandlordRoomItem,
  LandlordAppointmentItem,
} from '../../types/landlord.types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<LandlordDashboardStats | null>(null);
  const [recentRooms, setRecentRooms] = useState<LandlordRoomItem[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<LandlordAppointmentItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, roomsData, appointmentsData] = await Promise.all([
          landlordService.getDashboardStats(),
          landlordService.getMyRooms(),
          landlordService.getAppointments(),
        ]);
        setStats(statsData);
        setRecentRooms(roomsData.slice(0, 3));
        setRecentAppointments(appointmentsData.slice(0, 4));
      } catch {
        // fallback
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-cyan-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
            Cổng Quản Trị Dành Cho Chủ Trọ
          </span>
          <h2 className="text-2xl font-extrabold mt-1">Xin chào, Trần Văn Khải! 👋</h2>
          <p className="text-xs text-cyan-100 mt-1 max-w-xl">
            Hôm nay bạn có <strong>{stats?.yeuCauMoi || 0} lịch hẹn xem phòng</strong> mới đang chờ xác nhận. Hãy kiểm tra và phản hồi khách sớm nhé!
          </p>
        </div>
        <button
          onClick={() => navigate('/landlord/rooms/create')}
          className="px-5 py-2.5 bg-white text-cyan-700 hover:bg-cyan-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-cyan-600" />
          <span>Đăng phòng mới ngay</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số dư ví */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Số Dư Khả Dụng
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.soDu ? stats.soDu.toLocaleString('vi-VN') : '0'} đ
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Có thể rút về ngân hàng</span>
          </div>
        </div>

        {/* Card 2: Quản lý phòng */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Phòng Quản Lý
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.tongPhong || 0} <span className="text-sm font-semibold text-slate-400">phòng</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-bold">{stats?.dangThue || 0} đang thuê</span>
            <span>•</span>
            <span className="text-cyan-600 font-bold">{stats?.dangTrong || 0} phòng trống</span>
          </div>
        </div>

        {/* Card 3: Lịch hẹn chờ duyệt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lịch Hẹn Chờ Duyệt
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.yeuCauMoi || 0} <span className="text-sm font-semibold text-slate-400">yêu cầu</span>
          </p>
          <p className="text-[11px] text-amber-600 font-medium mt-2">
            Cọc giữ chân đã nộp vào hệ thống
          </p>
        </div>

        {/* Card 4: Điểm uy tín */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Điểm Uy Tín Chủ Trọ
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            98 <span className="text-sm font-semibold text-slate-400">/ 100</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hạng: Chủ trọ Vàng</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Appointments & Active Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Lịch hẹn gần đây */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lịch Hẹn Xem Phòng Gần Đây</h3>
              <p className="text-xs text-slate-500">Khách thuê đã cọc giữ chân lịch hẹn</p>
            </div>
            <button
              onClick={() => navigate('/landlord/appointments')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có lịch hẹn nào</p>
            ) : (
              recentAppointments.map((item) => (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.hinhAnh || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'}
                      alt={item.phongTen}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{item.phongTen}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Khách: <strong>{item.khachHangTen}</strong> ({item.sdt})
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-600" />
                        <span>{item.thoiGian} ngày {item.ngayHen}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.trangThai === 'CHO_XAC_NHAN'
                          ? 'bg-amber-100 text-amber-700'
                          : item.trangThai === 'XAC_NHAN'
                          ? 'bg-cyan-100 text-cyan-700'
                          : item.trangThai === 'HOAN_THANH'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {item.trangThai === 'CHO_XAC_NHAN'
                        ? 'Chờ duyệt'
                        : item.trangThai === 'XAC_NHAN'
                        ? 'Đã duyệt'
                        : item.trangThai === 'HOAN_THANH'
                        ? 'Hoàn thành'
                        : 'Đã hủy'}
                    </span>
                    <p className="text-[11px] font-bold text-slate-700 mt-1">
                      Cọc: {item.coc?.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Danh sách phòng nổi bật */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Phòng Trọ Của Bạn</h3>
              <p className="text-xs text-slate-500">Danh sách bài đăng phòng</p>
            </div>
            <button
              onClick={() => navigate('/landlord/rooms')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {recentRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/landlord/rooms/edit/${room.id}`)}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/20 transition-all cursor-pointer flex items-center gap-3"
              >
                <img
                  src={room.hinhAnhUrl}
                  alt={room.tenPhong}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{room.tenPhong}</h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{room.diaChi}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-black text-cyan-700">
                      {room.giaThue.toLocaleString('vi-VN')} đ/tháng
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        room.trangThai === 'DA_DUYET'
                          ? 'bg-emerald-100 text-emerald-700'
                          : room.trangThai === 'CHO_DUYET'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {room.trangThai === 'DA_DUYET' ? 'Đang hiển thị' : 'Chờ duyệt'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/landlord/rooms/create')}
            className="w-full mt-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-cyan-600" />
            <span>Thêm phòng trọ mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
