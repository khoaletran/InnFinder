import { LandlordQueryError } from '@/components/landlord/LandlordQueryError';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  History,
  Home,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AppointmentDetailModal } from '@/components/landlord/AppointmentDetailModal';
import { RoomDetailModal } from '@/components/landlord/RoomDetailModal';
import { landlordService } from '@/services/landlord.service';
import { useLandlordStore } from '@/store/useLandlordStore';
import type {
  LandlordAppointmentItem,
  LandlordRoomItem,
  TrangThaiPhongTro,
} from '@/types/landlord.types';
import { formatDateTime, formatPhoneNumber, formatVND } from '@/utils/formatters';

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

  const {
    data: rooms = [],
    isLoading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms,
  } = useQuery({
    queryKey: ['landlord', 'rooms'],
    queryFn: landlordService.getMyRooms,
    refetchInterval: 30000,
  });

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['landlord', 'appointments'],
    queryFn: landlordService.getAppointments,
    refetchInterval: 30000,
  });

  const {
    data: walletInfo,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['landlord', 'wallet'],
    queryFn: landlordService.getWalletInfo,
    refetchInterval: 30000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['landlord', 'reviews'],
    queryFn: landlordService.getReviews,
    refetchInterval: 60000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['landlord', 'analytics', 6],
    queryFn: () => landlordService.getAnalytics(6),
    refetchInterval: 60000,
  });

  const { data: reputationSummary } = useQuery({
    queryKey: ['landlord', 'reputation-summary'],
    queryFn: landlordService.getReputationSummary,
    refetchInterval: 30000,
  });

  const stats = useMemo(() => {
    const tongPhong = rooms.length;
    const phongChoDuyet = rooms.filter((r) => r.trangThai === 'CHO_DUYET').length;
    const dangTrong = rooms.filter((r) => r.trangThai === 'DA_DUYET').length;
    const dangThue = rooms.filter((r) => r.trangThai === 'HOAN_THANH').length;
    const yeuCauMoi = appointments.filter((a) => a.trangThai === 'CHO_XAC_NHAN').length;
    const avgScore =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.diem, 0) / reviews.length).toFixed(1)
        : 'Chưa có';
    return {
      tongPhong,
      phongChoDuyet,
      dangTrong,
      dangThue,
      tongDanhGia: reviews.length,
      diemDanhGia: avgScore,
      soDu: walletInfo?.soDu ?? 0,
      diemUyTin: walletInfo?.diemUyTin,
      tamAnDen: walletInfo?.tamAnDen,
      yeuCauMoi,
      tongPhongMoi: phongChoDuyet,
    };
  }, [rooms, appointments, reviews, walletInfo]);

  useEffect(() => {
    setStoreStats(stats);
  }, [stats, setStoreStats]);

  const diemUyTin = reputationSummary?.diemUyTin ?? stats.diemUyTin ?? 100;
  const reputationRank =
    reputationSummary?.phanHang ||
    (diemUyTin >= 90
      ? 'Chủ trọ Uy tín Cao'
      : diemUyTin >= 81
        ? 'Chủ trọ Tiêu chuẩn (Tốt)'
        : diemUyTin >= 70
          ? 'Chủ trọ Tiêu chuẩn (Mất đề xuất)'
          : diemUyTin >= 50
            ? 'Hạn chế (Tối đa 3 phòng)'
            : diemUyTin >= 30
              ? 'Đình chỉ đăng tin mới'
              : 'Nguy cơ khóa tài khoản');
  const isTempHidden = Boolean(reputationSummary?.dangTamAn);
  const tamAnDen = reputationSummary?.tamAnDen ?? stats.tamAnDen;

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

  if (walletError && roomsError && !walletInfo && rooms.length === 0) {
    return (
      <LandlordQueryError
        error={walletError || roomsError}
        onRetry={() => {
          void refetchWallet();
          void refetchRooms();
          void refetchAppointments();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {(isTempHidden || diemUyTin < 70) && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            isTempHidden || diemUyTin < 50
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              isTempHidden || diemUyTin < 50 ? 'text-rose-600' : 'text-amber-600'
            }`}
          />
          <div className="text-xs leading-relaxed space-y-1">
            {isTempHidden ? (
              <>
                <p className="font-bold">
                  Bài đăng của bạn đang bị tạm ẩn đến {formatDateTime(tamAnDen || '')}
                </p>
                <p>
                  Trong thời gian tạm ẩn, các phòng không hiển thị tìm kiếm và tạm khóa đăng mới/bật hiển thị. Bạn vẫn có thể hoàn tất lịch hẹn đã xác nhận và rút số dư ví hợp lệ.
                </p>
              </>
            ) : diemUyTin < 50 ? (
              <>
                <p className="font-bold">
                  Điểm uy tín hiện tại ({diemUyTin}/100) dưới ngưỡng 50 — Tạm đình chỉ đăng tin mới
                </p>
                <p>
                  Hệ thống tạm khóa quyền đăng phòng mới và bật hiển thị phòng ẩn. Nếu điểm tiếp tục giảm dưới 30, tài khoản sẽ bị tự động khóa. Hãy hoàn thành tốt lịch hẹn để phục hồi điểm.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold">
                  Điểm uy tín hiện tại ({diemUyTin}/100) ở mức hạn chế — Tối đa 3 phòng hoạt động
                </p>
                <p>
                  Bạn chỉ được duy trì tối đa 3 phòng đang hiển thị hoặc chờ duyệt cùng lúc và mất suất Phòng đề xuất. Duy trì lịch hẹn sạch để nhanh chóng phục hồi điểm.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số Dư Khả Dụng - Điểm nhấn màu chính (Primary Teal) */}
        <Card
          onClick={() => navigate('/landlord/wallet')}
          className="bg-white p-5 rounded-2xl border border-teal-200/80 shadow-xs hover:shadow-md hover:border-teal-400/80 active:scale-[0.99] transition-all relative overflow-hidden cursor-pointer group"
        >
          <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600 rounded-l-2xl" />
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-teal-700 transition-colors">
              Số Dư Khả Dụng
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            {walletLoading && !walletInfo ? (
              <div className="h-8 w-36 bg-slate-200/80 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900 group-hover:text-teal-900 transition-colors">
                {formatVND(stats.soDu)}
              </p>
            )}
            <div className="flex items-center justify-between mt-2 text-[11px] text-teal-700 font-semibold">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Có thể rút về ngân hàng</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-teal-600" />
            </div>
          </Card.Content>
        </Card>

        {/* Card 2: Tổng Phòng Quản Lý - Màu phụ tối giản */}
        <Card
          onClick={() => navigate('/landlord/rooms')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
              Tổng Phòng Quản Lý
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Home className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            {roomsLoading && rooms.length === 0 ? (
              <div className="h-8 w-24 bg-slate-200/80 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900">
                {stats.tongPhong}{' '}
                <span className="text-sm font-semibold text-slate-400">phòng</span>
              </p>
            )}
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{stats.dangThue} đã thuê</span>
                <span>•</span>
                <span className="font-semibold text-teal-700">{stats.dangTrong} đang trống</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" />
            </div>
          </Card.Content>
        </Card>

        {/* Card 3: Lịch Hẹn Chờ Duyệt - Màu phụ tối giản */}
        <Card
          onClick={() => navigate('/landlord/appointments')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
              Lịch Hẹn Chờ Duyệt
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            {appointmentsLoading && appointments.length === 0 ? (
              <div className="h-8 w-24 bg-slate-200/80 rounded-lg animate-pulse" />
            ) : (
              <p className="text-2xl font-black text-slate-900">
                {stats.yeuCauMoi}{' '}
                <span className="text-sm font-semibold text-slate-400">yêu cầu</span>
              </p>
            )}
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-medium">
              <span>{stats.phongChoDuyet} tin đăng đang chờ Admin duyệt</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" />
            </div>
          </Card.Content>
        </Card>

        {/* Card 4: Điểm Uy Tín Chủ Trọ - Màu phụ tối giản */}
        <Card
          onClick={() => navigate('/landlord/reviews')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer group"
        >
          <Card.Header className="p-0 flex flex-row items-center justify-between">
            <Card.Title className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition-colors">
              Điểm Uy Tín Chủ Trọ
            </Card.Title>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </Card.Header>
          <Card.Content className="p-0 mt-2">
            <p className="text-2xl font-black text-slate-900">
              {diemUyTin}{' '}
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-700 font-semibold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{reputationRank}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Đề xuất tối ưu hôm nay (ghim từ Thống kê & Tối ưu) */}
      {analytics && analytics.deXuatCaiThien.length > 0 && (
        <Card className="bg-white rounded-2xl border border-teal-200/80 p-5 shadow-xs">
          <Card.Header className="p-0 pb-3.5 flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <Card.Title className="text-sm font-bold text-slate-900">
                  Đề xuất tối ưu hôm nay
                </Card.Title>
                <Card.Description className="text-[11px] text-slate-500">
                  Gợi ý ưu tiên dựa trên lượt xem, giá thị trường và lịch hẹn phòng trọ của bạn
                </Card.Description>
              </div>
            </div>
            <Link
              to="/landlord/statistics"
              className="text-xs font-bold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 shrink-0"
            >
              <span>Xem thống kê chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card.Header>
          <Card.Content className="p-0 grid grid-cols-1 md:grid-cols-3 gap-3">
            {analytics.deXuatCaiThien.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{rec.tieuDe}</span>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rec.mucDoUuTien === 'CAO'
                          ? 'bg-rose-50 text-rose-700'
                          : rec.mucDoUuTien === 'TRUNG_BINH'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {rec.mucDoUuTien === 'CAO' ? 'Ưu tiên' : rec.mucDoUuTien === 'TRUNG_BINH' ? 'Nên làm' : 'Gợi ý'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{rec.moTa}</p>
                </div>
                <div className="flex justify-end">
                  <Link
                    to={rec.duongDan}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
                  >
                    <span>{rec.hanhDongLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </Card.Content>
        </Card>
      )}

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
            {appointmentsLoading && recentAppointments.length === 0 ? (
              <div className="space-y-3 py-2 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-14 rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
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
              {roomsLoading && recentRooms.length === 0 ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-16 rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : recentRooms.length === 0 ? (
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

      {/* Lịch sử biến động điểm uy tín */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <Card.Header className="p-0 pb-3.5 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <Card.Title className="text-sm font-bold text-slate-900">
                Lịch Sử Biến Động Điểm Uy Tín
              </Card.Title>
              <Card.Description className="text-[11px] text-slate-500">
                Theo dõi các lần cộng/trừ điểm uy tín và chế tài áp dụng trên tài khoản Chủ trọ
              </Card.Description>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            {diemUyTin} / 100 điểm
          </span>
        </Card.Header>
        <Card.Content className="p-0">
          {!reputationSummary?.lichSu || reputationSummary.lichSu.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Chưa có biến động điểm uy tín nào được ghi nhận.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {reputationSummary.lichSu.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.lyDo}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDateTime(item.thoiGian)} • {item.loaiSuKien}
                      {item.maThamChieu ? ` • #${item.maThamChieu}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block font-black tabular-nums ${
                        item.bienDong > 0
                          ? 'text-teal-700'
                          : item.bienDong < 0
                            ? 'text-rose-600'
                            : 'text-amber-700'
                      }`}
                    >
                      {item.bienDong > 0 ? `+${item.bienDong}` : item.bienDong} điểm
                    </span>
                    <p className="text-[10px] text-slate-400 tabular-nums">
                      {item.diemTruoc} ➔ {item.diemSau}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

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
