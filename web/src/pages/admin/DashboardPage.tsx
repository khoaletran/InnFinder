import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
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
        <div className="h-44 bg-surface rounded-[var(--radius-card)] border border-border" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 h-80 bg-surface rounded-[var(--radius-card)] border border-border" />
          <div className="lg:col-span-8 h-80 bg-surface rounded-[var(--radius-card)] border border-border" />
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
          <h1 className="text-2xl font-semibold text-text tracking-[-0.01em]">
            Tổng quan vận hành sàn
          </h1>
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
        <h1 className="text-2xl font-semibold text-text tracking-[-0.01em]">
          Tổng quan vận hành sàn
        </h1>

        <AdminRefreshButton
          onClick={handleRefresh}
          isRefreshing={isRefreshing}
          label="Làm mới số liệu"
        />
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-[var(--radius-card)] bg-surface border border-border shadow-[var(--shadow-card)]">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-medium text-text-muted">Tổng người dùng</span>
              <div className="text-2xl font-semibold text-text mt-1 tabular-nums">
                {(stats?.nguoiDung.total ?? 0).toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-surface-muted text-text-secondary flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-[var(--radius-card)] bg-surface border border-border shadow-[var(--shadow-card)]">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-medium text-text-muted">Tin đăng phòng trọ</span>
              <div className="text-2xl font-semibold text-text mt-1 tabular-nums">
                {(stats?.soTinDang.total ?? 0).toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-surface-muted text-text-secondary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-[var(--radius-card)] bg-surface border border-border shadow-[var(--shadow-card)]">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-medium text-text-muted">Doanh thu hoa hồng sàn</span>
              <div className="text-2xl font-semibold text-accent mt-1 tabular-nums">
                {stats?.doanhThu.total || '0 đ'}
              </div>
              <p className="text-xs text-text-muted mt-1">
                Từ các giao dịch thuê hoàn tất
              </p>
            </div>
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>

        <Card className="p-5 rounded-[var(--radius-card)] bg-surface border border-border shadow-[var(--shadow-card)]">
          <Card.Content className="p-0 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-medium text-text-muted">Khiếu nại chờ duyệt</span>
              <div
                className={`text-2xl font-semibold mt-1 tabular-nums ${
                  stats?.khieuNai.isAlert ? 'text-danger-text' : 'text-text-muted'
                }`}
              >
                {stats?.khieuNai.total ?? 0}
              </div>
              <div className="mt-1">
                {stats?.khieuNai.isAlert ? (
                  <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-badge)] bg-danger-bg text-danger-text text-xs font-medium">
                    Cần xử lý ngay
                  </span>
                ) : (
                  <span className="text-xs text-text-muted font-normal">
                    Tất cả đã giải quyết
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 ${
                stats?.khieuNai.isAlert
                  ? 'bg-danger-bg text-danger-text'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* CENTRAL TREASURY LEDGER — CARD TRẮNG VIỀN MẢNH */}
      <Card className="bg-surface rounded-[var(--radius-card)] p-6 text-text border border-border shadow-[var(--shadow-card)]">
        <Card.Header className="p-0 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-[0.04em]">
              <Wallet className="w-4 h-4 text-accent" />
              Ngân khố hệ thống
            </div>
            <Card.Title className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-sm font-medium text-text-secondary">
                Tổng quỹ hệ thống đang luân chuyển:
              </span>
              <span className="text-[28px] leading-tight font-semibold text-text tabular-nums tracking-[-0.01em]">
                {formatVND(treasury?.tongQuyHeThong)}
              </span>
            </Card.Title>
            <p className="text-xs text-text-muted mt-1 tabular-nums">
              Tổng tiền thực tế trong két:{' '}
              <strong className="font-semibold text-text">{formatVND(treasury?.tongQuyThucTe)}</strong>{' '}
              (Quỹ luân chuyển {formatVND(treasury?.tongQuyHeThong)} + Doanh thu sàn{' '}
              {formatVND(treasury?.tongDoanhThu)})
            </p>
          </div>
          <Link
            to="/admin/transactions"
            className="px-3.5 py-2 rounded-[var(--radius-control)] bg-surface hover:bg-bg border border-border text-xs font-medium text-text-secondary flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            Quản lý dòng tiền
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card.Header>

        <Card.Content className="p-0 pt-5 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="py-3 sm:py-0 sm:pr-5">
            <span className="text-xs font-medium text-text-muted block mb-1">
              Quỹ cọc giữ chân tạm giữ
            </span>
            <div className="text-lg font-semibold text-text tabular-nums">
              {formatVND(quyTamGiuCoc)}
            </div>
            <p className="text-xs text-text-muted mt-1">Đang chờ khách đi xem phòng thực tế</p>
          </div>

          <div className="py-3 sm:py-0 sm:px-5">
            <span className="text-xs font-medium text-text-muted block mb-1">
              Tổng số dư ví các Chủ trọ
            </span>
            <div className="text-lg font-semibold text-text tabular-nums">
              {formatVND(tongSoDuViChuTro)}
            </div>
            <p className="text-xs text-text-muted mt-1">Khả dụng cho các chủ trọ rút về</p>
          </div>

          <div className="py-3 sm:py-0 sm:px-5">
            <span className="text-xs font-medium text-text-muted block mb-1">
              Quỹ yêu cầu rút tiền
            </span>
            <div className="text-lg font-semibold text-text tabular-nums">
              {formatVND(quyChoRut)}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Đang đợi Admin phê duyệt chuyển khoản
            </p>
          </div>

          <div className="py-3 sm:py-0 sm:pl-5">
            <span className="text-xs font-medium text-text-muted block mb-1">
              Lệnh rút tiền chờ duyệt
            </span>
            <div
              className={`text-lg font-semibold tabular-nums ${
                soLenhRutChoDuyet > 0 ? 'text-danger-text' : 'text-text-muted'
              }`}
            >
              {soLenhRutChoDuyet} lệnh
            </div>
            <p className="text-xs text-text-muted mt-1">Cần đối soát tài khoản ngân hàng</p>
          </div>
        </Card.Content>
      </Card>

      {/* Action Queue & PlatformRevenueChart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 bg-surface rounded-[var(--radius-card)] border border-border p-6 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            <Card.Header className="p-0 pb-4 flex flex-row items-center justify-between">
              <Card.Title className="text-sm font-semibold text-text tracking-[-0.01em]">
                Hàng đợi hành động cần xử lý
              </Card.Title>
            </Card.Header>

            <Card.Content className="p-0 space-y-2.5">
              <Link
                to="/admin/posts"
                className="p-3.5 rounded-[var(--radius-control)] border border-border hover:border-border-strong hover:bg-surface-subtle flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-control)] bg-surface-muted text-text-secondary flex items-center justify-center font-medium text-xs">
                    PT
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text">Tin đăng phòng mới</h4>
                    <p className="text-xs text-text-muted">Chờ kiểm duyệt hình ảnh & giá</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium tabular-nums ${
                    tinMoi > 0 ? 'bg-accent-soft text-accent' : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {tinMoi}
                </span>
              </Link>

              <Link
                to="/admin/users"
                className="p-3.5 rounded-[var(--radius-control)] border border-border hover:border-border-strong hover:bg-surface-subtle flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-control)] bg-surface-muted text-text-secondary flex items-center justify-center font-medium text-xs">
                    CT
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text">Xác minh CCCD Chủ trọ</h4>
                    <p className="text-xs text-text-muted">Chờ duyệt hồ sơ & số tài khoản</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium tabular-nums ${
                    xacMinhChuTro > 0
                      ? 'bg-warning-bg text-warning-text'
                      : 'bg-surface-muted text-text-muted'
                  }`}
                >
                  {xacMinhChuTro}
                </span>
              </Link>

              <Link
                to="/admin/complaints"
                className="p-3.5 rounded-[var(--radius-control)] border border-border hover:border-border-strong hover:bg-surface-subtle flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-control)] bg-surface-muted text-text-secondary flex items-center justify-center font-medium text-xs">
                    KN
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text">Báo cáo khiếu nại</h4>
                    <p className="text-xs text-text-muted">Tranh chấp cọc & vi phạm nội quy</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-[var(--radius-badge)] text-xs font-medium tabular-nums ${
                    baoCaoViPham > 0
                      ? 'bg-danger-bg text-danger-text'
                      : 'bg-surface-muted text-text-muted'
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
