import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Spinner } from '@heroui/react';
import {
  Users,
  Building2,
  AlertTriangle,
  Wallet,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { formatVND } from '@/utils/formatters';

export const DashboardPage: React.FC = () => {
  const {
    data: stats,
    isLoading: isLoadingStats,
    isFetching: isFetchingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
  });

  const {
    data: treasury,
    isLoading: isLoadingTreasury,
    isFetching: isFetchingTreasury,
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-medium">
          Đang tải số liệu tổng quan & ngân khố sàn...
        </span>
      </div>
    );
  }

  const isRefreshing = isFetchingStats || isFetchingTreasury;

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tổng quan vận hành sàn</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đối soát hoa hồng môi giới (`phiThu`), hàng đợi kiểm duyệt và ngân khố trung tâm theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới số liệu
          </button>
        </div>
      </div>

      {/* Platform Revenue Governance Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Quy chuẩn Doanh thu Sàn:</strong> Doanh thu của hệ thống chỉ được tính từ tổng phí hoa hồng{' '}
          <code className="px-1 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px]">
            SUM(phiThu)
          </code>{' '}
          của các phiếu đặt lịch đã hoàn tất (<code className="font-mono text-[11px]">HOAN_THANH</code>), tuyệt đối không tính từ tổng dòng tiền sổ cái <code className="font-mono text-[11px]">GiaoDich</code>.
        </p>
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
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>Tài khoản hệ thống</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
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
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>Tổng tin trên sàn</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500">Doanh thu hoa hồng sàn</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {stats?.doanhThu.total || '0 ₫'}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                SUM(phiThu) từ lịch HOAN_THANH
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
                  stats?.khieuNai.isAlert ? 'text-rose-600' : 'text-slate-900'
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
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tất cả đã giải quyết
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                stats?.khieuNai.isAlert
                  ? 'bg-rose-50 text-rose-600 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* CENTRAL TREASURY LEDGER */}
      <Card className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl border-none relative overflow-hidden">
        <Card.Header className="p-0 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Wallet className="w-4 h-4" />
              Sổ cái ngân khố trung tâm sàn InnFinder (Đối soát dòng tiền, không phải doanh thu)
            </div>
            <Card.Title className="text-xl font-black text-white mt-1">
              Tổng quỹ hệ thống đang luân chuyển:{' '}
              <span className="text-emerald-400">{formatVND(treasury?.tongQuyHeThong)}</span>
            </Card.Title>
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
            <div className="text-lg font-bold text-amber-300">
              {formatVND(treasury?.quyTamGiuCoc)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Đang chờ khách đi xem phòng thực tế</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Tổng số dư ví các Chủ trọ</span>
            <div className="text-lg font-bold text-emerald-300">
              {formatVND(treasury?.tongSoDuViChuTro)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Khả dụng cho các chủ trọ rút về</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Quỹ yêu cầu rút tiền</span>
            <div className="text-lg font-bold text-blue-300">
              {formatVND(treasury?.quyChoRut)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Đang đợi Admin phê duyệt chuyển khoản
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-slate-300 block mb-1">Lệnh rút tiền chờ duyệt</span>
            <div className="text-lg font-bold text-rose-300">
              {treasury?.soLenhRutChoDuyet ?? 0} lệnh
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
              <Chip size="sm" variant="soft" color="warning" className="font-bold">
                Ưu tiên
              </Chip>
            </Card.Header>

            <Card.Content className="p-0 space-y-3">
              <Link
                to="/admin/posts"
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    PT
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Tin đăng phòng mới</h4>
                    <p className="text-[11px] text-slate-500">Chờ kiểm duyệt hình ảnh & giá</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-600 text-white">
                  {stats?.hangDoi.tinMoi ?? 0}
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
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white">
                  {stats?.hangDoi.xacMinhChuTro ?? 0}
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
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white">
                  {stats?.hangDoi.baoCaoViPham ?? 0}
                </span>
              </Link>
            </Card.Content>
          </div>

          <Card.Footer className="p-0 mt-6 pt-4 border-t border-slate-100 justify-center">
            <span className="text-[11px] text-slate-400">
              Kiểm duyệt kịp thời giúp duy trì uy tín hệ thống
            </span>
          </Card.Footer>
        </Card>

        <div className="lg:col-span-8">
          <PlatformRevenueChart
            data={stats?.tangTruongGiaoDich || []}
            title="Tăng trưởng Doanh thu Hoa hồng Sàn (phiThu)"
            subtitle="Tính độc quyền từ SUM(phiThu) của các PhieuDatLich đạt trạng thái HOAN_THANH (không lấy từ bảng GiaoDich)"
          />
        </div>
      </div>
    </div>
  );
};
