import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useEffect, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Home,
  Loader2,
  MapPin,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppointmentDetailModal } from '@/components/landlord/AppointmentDetailModal';
import { RoomDetailModal } from '@/components/landlord/RoomDetailModal';
import { landlordService } from '@/services/landlord.service';
import { useLandlordStore } from '@/store/useLandlordStore';
import type {
  LandlordAppointmentItem,
  LandlordRoomItem,
  TrangThaiPhongTro,
} from '@/types/landlord.types';
import { formatPhoneNumber, formatVND } from '@/utils/formatters';

const renderRoomStatusChip = (status: TrangThaiPhongTro) => {
  switch (status) {
    case 'DA_DUYET':
      return (
        <Chip size="sm" color="success" variant="soft">
          <Chip.Label>Đã duyệt</Chip.Label>
        </Chip>
      );
    case 'CHO_DUYET':
      return (
        <Chip size="sm" color="warning" variant="soft">
          <Chip.Label>Chờ duyệt</Chip.Label>
        </Chip>
      );
    case 'HOAN_THANH':
      return (
        <Chip size="sm" color="accent" variant="soft">
          <Chip.Label>Đã cho thuê</Chip.Label>
        </Chip>
      );
    case 'HUY':
    default:
      return (
        <Chip size="sm" color="danger" variant="soft">
          <Chip.Label>Đã hủy</Chip.Label>
        </Chip>
      );
  }
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const setStoreStats = useLandlordStore((s) => s.setStats);

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['landlord', 'dashboard-stats'],
    queryFn: landlordService.getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['landlord', 'appointments'],
    queryFn: landlordService.getAppointments,
  });

  useEffect(() => {
    if (stats) {
      setStoreStats(stats);
    }
  }, [stats, setStoreStats]);

  const diemUyTin = stats?.diemUyTin ?? 100;
  const reputationRank =
    diemUyTin >= 90
      ? 'Chủ trọ Uy tín Cao'
      : diemUyTin >= 70
        ? 'Chủ trọ Tiêu chuẩn'
        : 'Cần cải thiện uy tín';

  const recentRooms = rooms.slice(0, 4);
  const recentAppointments = appointments.slice(0, 4);

  const [selectedAppointment, setSelectedAppointment] =
    useState<LandlordAppointmentItem | null>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<LandlordRoomItem | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);

  const handleOpenAppointment = (appointment: LandlordAppointmentItem) => {
    setSelectedAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenRoom = (room: LandlordRoomItem) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };

  if (statsError) return <LandlordQueryError error={statsError} onRetry={() => void refetchStats()} />;

  if (statsLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mb-2" />
        <span className="text-xs font-medium">Đang tải dữ liệu tổng quan Chủ trọ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số Dư Khả Dụng - Điểm nhấn màu chính (Primary Teal) */}
        <Card className="bg-white p-5 rounded-2xl border border-teal-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600 rounded-l-2xl" />
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Số Dư Khả Dụng
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-2xl font-black text-slate-900">
              {formatVND(stats?.soDu ?? 0)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-teal-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Có thể rút về ngân hàng</span>
            </div>
          </Card.Content>
        </Card>

        {/* Card 2: Tổng Phòng Quản Lý - Màu phụ tối giản */}
        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng Phòng Quản Lý
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Home className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-2xl font-black text-slate-900">
              {stats?.tongPhong ?? 0}{' '}
              <span className="text-sm font-semibold text-slate-400">phòng</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">{stats?.dangThue ?? 0} đã thuê</span>
              <span>•</span>
              <span className="font-semibold text-teal-700">{stats?.dangTrong ?? 0} đang trống</span>
            </div>
          </Card.Content>
        </Card>

        {/* Card 3: Lịch Hẹn Chờ Duyệt - Màu phụ tối giản */}
        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lịch Hẹn Chờ Duyệt
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-2xl font-black text-slate-900">
              {stats?.yeuCauMoi ?? 0}{' '}
              <span className="text-sm font-semibold text-slate-400">yêu cầu</span>
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-2">
              {stats?.phongChoDuyet ?? 0} tin đăng đang chờ Admin duyệt
            </p>
          </Card.Content>
        </Card>

        {/* Card 4: Điểm Uy Tín Chủ Trọ - Màu phụ tối giản */}
        <Card className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Điểm Uy Tín Chủ Trọ
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-2xl font-black text-slate-900">
              {diemUyTin}{' '}
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{reputationRank}</span>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <Card.Header className="p-0 pb-4 flex flex-row items-center justify-between">
            <div>
              <Card.Title className="text-base font-bold text-slate-900">
                Lịch Hẹn Xem Phòng Gần Đây
              </Card.Title>
            </div>
            <button
              type="button"
              onClick={() => navigate('/landlord/appointments')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card.Header>

          <Card.Content className="p-0 divide-y divide-slate-100">
            {recentAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Chưa có lịch hẹn xem phòng nào
              </p>
            ) : (
              recentAppointments.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenAppointment(item)}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 rounded-xl px-2 transition-colors cursor-pointer"
                  title="Bấm để xem chi tiết lịch hẹn"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        item.hinhAnh ||
                        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
                      }
                      alt={item.phongTen}
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {item.phongTen}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        Khách: <strong>{item.khachHangTen}</strong> ({formatPhoneNumber(item.sdt)})
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-cyan-600" />
                        <span>
                          {item.thoiGian} ngày {item.ngayHen}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Chip
                      size="sm"
                      variant="soft"
                      color={
                        item.trangThai === 'CHO_XAC_NHAN'
                          ? 'warning'
                          : item.trangThai === 'XAC_NHAN'
                            ? 'accent'
                            : item.trangThai === 'HOAN_THANH'
                              ? 'success'
                              : 'danger'
                      }
                    >
                      <Chip.Label>
                        {item.trangThai === 'CHO_XAC_NHAN'
                          ? 'Chờ duyệt'
                          : item.trangThai === 'XAC_NHAN'
                            ? 'Đã xác nhận'
                            : item.trangThai === 'HOAN_THANH'
                              ? 'Hoàn thành'
                              : 'Đã hủy'}
                      </Chip.Label>
                    </Chip>
                    <p className="text-[11px] font-bold text-slate-700 mt-1">
                      Cọc: {formatVND(item.coc)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Card.Content>
        </Card>

        <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <Card.Header className="p-0 pb-4 flex flex-row items-center justify-between">
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  Phòng Trọ Của Bạn
                </Card.Title>
              </div>
              <button
                type="button"
                onClick={() => navigate('/landlord/rooms')}
                className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Card.Header>

            <Card.Content className="p-0 space-y-3">
              {recentRooms.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Bạn chưa đăng phòng trọ nào
                </p>
              ) : (
                recentRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleOpenRoom(room)}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/20 transition-all cursor-pointer flex items-center gap-3"
                    title="Bấm để xem chi tiết phòng trọ"
                  >
                    <img
                      src={
                        room.hinhAnhUrl ||
                        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
                      }
                      alt={room.tenPhong}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{room.tenPhong}</h4>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{room.diaChi}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <span className="text-xs font-black text-cyan-700">
                          {formatVND(room.giaThue)}/tháng
                        </span>
                        {renderRoomStatusChip(room.trangThai)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card.Content>
          </div>

          <Card.Footer className="p-0 pt-4">
            <button
              type="button"
              onClick={() => navigate('/landlord/rooms/create')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-600" />
              <span>Thêm phòng trọ mới</span>
            </button>
          </Card.Footer>
        </Card>
      </div>

      {/* MODAL CHI TIẾT LỊCH HẸN */}
      <AppointmentDetailModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        appointment={selectedAppointment}
      />

      {/* MODAL CHI TIẾT PHÒNG TRỌ (KÈM GALLERY LIGHTBOX) */}
      <RoomDetailModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        room={selectedRoom}
        onEdit={(maPhongTro) => navigate(`/landlord/rooms/edit/${maPhongTro}`)}
      />
    </div>
  );
};
