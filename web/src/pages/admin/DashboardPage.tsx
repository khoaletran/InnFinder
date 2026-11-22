import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip } from '@heroui/react';
import {
  Users,
  Building2,
  AlertTriangle,
  Wallet,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';

export const DashboardPage: React.FC = () => {
  const {
    data: stats,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    isError: isErrorStats,
    error: errorStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  const {
    data: treasury,
    isLoading: isLoadingTreasury,
    isFetching: isFetchingTreasury,
    isError: isErrorTreasury,
    error: errorTreasury,
    refetch: refetchTreasury,
  } = useQuery({
    queryKey: ['admin', 'treasury-stats'],
    queryFn: () => adminService.getTreasuryStats(),
  });

  const handleRefresh = () => {
    void refetchStats();
    void refetchTreasury();
  };

  if (isLoadingStats || isLoadingTreasury) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-80 bg-slate-200/80 rounded" />
          </div>
          <div className="h-9 w-28 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-14 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white rounded-2xl border border-slate-200 p-5" />
          ))}
        </div>
        <div className="h-52 bg-slate-800/90 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-80 bg-white rounded-2xl border border-slate-200" />
          <div className="lg:col-span-8 h-80 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (isErrorStats || isErrorTreasury) {
    const errMsg =
      (errorStats instanceof Error && errorStats.message) ||
      (errorTreasury instanceof Error && errorTreasury.message) ||
      'Không thể tải số liệu tổng quan và ngân khố sàn.';
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan vận hành sàn</h1>
          <AdminRefreshButton onClick={handleRefresh} isRefreshing={isFetchingStats || isFetchingTreasury} />
        </div>
        <AdminErrorState
          title="Không thể tải dữ liệu bảng điều khiển"
          message={errMsg}
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  const isRefreshing = isFetchingStats || isFetchingTreasury;
  const quyTamGiuCoc = treasury?.quyTamGiuCoc ?? 0;
  const tongSoDuViChuTro = treasury?.tongSoDuViChuTro ?? 0;
  const quyChoRut = treasury?.quyChoRut ?? 0;
  const soLenhRutChoDuyet = treasury?.soLenhRutChoDuyet ?? 0;

  const tinMoi = stats?.hangDoi.tinMoi ?? 0;
  const xacMinhChuTro = stats?.hangDoi.xacMinhChuTro ?? 0;
  const baoCaoViPham = stats?.hangDoi.baoCaoViPham ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan vận hành sàn</h1>

        <AdminRefreshButton
          onClick={handleRefresh}
          isRefreshing={isRefreshing}
          label="Làm mới số liệu"
        />
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Tổng người dùng</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {(stats?.nguoiDung.total ?? 0).toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Tin đăng phòng trọ</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {(stats?.soTinDang.total ?? 0).toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Doanh thu hoa hồng sàn</span>
              <div className="text-2xl font-black text-teal-700 mt-1">
                {stats?.doanhThu.total || '0 ₫'}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Từ các giao dịch thuê hoàn tất
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Khiếu nại chờ duyệt</span>
              <div
                className={`text-2xl font-black mt-1 ${
                  stats?.khieuNai.isAlert ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {stats?.khieuNai.total ?? 0}
              </div>
              <div className="mt-1">
                {stats?.khieuNai.isAlert ? (
                  <Chip size="sm" variant="soft" color="danger" className="font-bold">
                    Cần xử lý ngay
                  </Chip>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Tất cả đã giải quyết
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                stats?.khieuNai.isAlert
                  ? 'bg-rose-50 text-rose-600 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* CENTRAL TREASURY LEDGER */}
      <Card className="bg-slate-900 rounded-2xl p-6 lg:p-7 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <Card.Header className="p-0 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              Ngân khố hệ thống
            </div>
            <Card.Title className="text-xl font-black text-white mt-1">
              Tổng quỹ hệ thống đang luân chuyển:{' '}
              <span className="text-emerald-400">{formatVND(treasury?.tongQuyHeThong)}</span>
            </Card.Title>
            <p className="text-[11px] text-slate-300 mt-1">
              Tổng tiền thực tế trong két:{' '}
              <strong className="text-white">{formatVND(treasury?.tongQuyThucTe)}</strong>{' '}
              (Quỹ luân chuyển {formatVND(treasury?.tongQuyHeThong)} + Doanh thu sàn{' '}
              {formatVND(treasury?.tongDoanhThu)})
            </p>
          </div>
          <Link
            to="/admin/transactions"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 self-start sm:self-auto transition-all"
          >
            Quản lý dòng tiền
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card.Header>

        <Card.Content className="p-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Quỹ cọc giữ chân tạm giữ</span>
            <div className={`text-lg font-bold ${quyTamGiuCoc > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
              {formatVND(quyTamGiuCoc)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Đang chờ khách đi xem phòng thực tế</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Tổng số dư ví các Chủ trọ</span>
            <div className={`text-lg font-bold ${tongSoDuViChuTro > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
              {formatVND(tongSoDuViChuTro)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Khả dụng cho các chủ trọ rút về</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Quỹ yêu cầu rút tiền</span>
            <div className={`text-lg font-bold ${quyChoRut > 0 ? 'text-sky-300' : 'text-slate-400'}`}>
              {formatVND(quyChoRut)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Đang đợi Admin phê duyệt chuyển khoản
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Lệnh rút tiền chờ duyệt</span>
            <div className={`text-lg font-bold ${soLenhRutChoDuyet > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
              {soLenhRutChoDuyet} lệnh
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Cần đối soát tài khoản ngân hàng</p>
          </div>
        </Card.Content>
      </Card>

      {/* Action Queue & PlatformRevenueChart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <Card.Header className="p-0 pb-4 flex flex-row items-center justify-between">
              <Card.Title className="text-sm font-bold text-slate-900">
                Hàng đợi hành động cần xử lý
              </Card.Title>
            </Card.Header>

            <Card.Content className="p-0 space-y-3">
              <Link
                to="/admin/posts"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                    PT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Tin đăng phòng mới</h4>
                    <p className="text-[11px] text-slate-500">Chờ kiểm duyệt hình ảnh & giá</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    tinMoi > 0 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tinMoi}
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    CT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Xác minh CCCD Chủ trọ</h4>
                    <p className="text-[11px] text-slate-500">Chờ duyệt hồ sơ & số tài khoản</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    xacMinhChuTro > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {xacMinhChuTro}
                </span>
              </Link>

              <Link
                to="/admin/complaints"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs">
                    KN
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Báo cáo khiếu nại</h4>
                    <p className="text-[11px] text-slate-500">Tranh chấp cọc & vi phạm nội quy</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    baoCaoViPham > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {baoCaoViPham}
                </span>
              </Link>
            </Card.Content>
          </div>
        </Card>

        <div className="lg:col-span-8">
          <PlatformRevenueChart
            data={stats?.tangTruongGiaoDich || []}
            title="Tăng trưởng Doanh thu Hoa hồng Sàn"
            subtitle="Tổng hợp theo tháng từ phí hoa hồng các giao dịch thuê phòng đã hoàn tất"
            isLoading={isLoadingStats}
            isError={isErrorStats}
            onRetry={handleRefresh}
          />
        </div>
      </div>
    </div>
  );
};
