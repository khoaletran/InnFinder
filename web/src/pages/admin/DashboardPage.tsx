import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
import {
  Users,
  Building2,
  Wallet,
  ArrowRight,
  Check,
  ChevronRight,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { MoneyText } from '@/components/common/MoneyText';

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
          <h1 className="text-[1.75rem] font-bold text-text tracking-[-0.02em]">
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
  const pending = [
    { label: 'Tin đăng chờ duyệt', count: stats?.hangDoi.tinMoi ?? 0, to: '/admin/posts' },
    { label: 'Hồ sơ CCCD chờ duyệt', count: stats?.hangDoi.xacMinhChuTro ?? 0, to: '/admin/users?tab=landlord-requests' },
    { label: 'Khiếu nại chờ duyệt', count: stats?.hangDoi.baoCaoViPham ?? 0, to: '/admin/complaints' },
    { label: 'Lệnh rút chờ duyệt', count: treasury?.soLenhRutChoDuyet ?? 0, to: '/admin/transactions?type=withdrawal' },
  ].filter(({ count }) => count > 0);

  return (
    <div className="@container space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-bold tracking-[-0.02em] text-text">
          Tổng quan vận hành sàn
        </h1>
        <AdminRefreshButton onClick={handleRefresh} isRefreshing={isRefreshing} label="Làm mới số liệu" />
      </header>

      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0 rounded-xl border border-border bg-surface-subtle p-5 @lg:p-6">
          <Card.Header className="flex flex-wrap items-start justify-between gap-4 p-0">
            <div className="min-w-0">
              <Card.Title className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-text-muted">
                <Wallet aria-hidden="true" className="size-4" />
                Ngân khố hệ thống
              </Card.Title>
              <p className="mt-3 text-[13px] font-medium text-text-muted">Tổng tiền trong ngân khố</p>
              <MoneyText
                amount={treasury?.tongQuyThucTe}
                className="mt-1 block text-[clamp(1.75rem,1.25rem+2cqi,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em] text-text"
                unitClassName="ml-1 text-base font-medium text-text-muted"
              />
            </div>
            <Link
              to="/admin/transactions"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:bg-bg"
            >
              Quản lý dòng tiền <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card.Header>

          <Card.Content className="p-0">
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <p className="text-[13px] text-text-muted">Quỹ giữ hộ</p>
                <MoneyText amount={treasury?.tongQuyHeThong} className="text-xl font-semibold text-text" />
              </div>
              <div>
                <p className="text-[13px] text-text-muted">Doanh thu hoa hồng</p>
                <MoneyText amount={treasury?.tongDoanhThu} className="text-xl font-semibold text-accent" />
              </div>
            </div>
            <dl className="mt-4 grid gap-y-3 border-t border-border pt-4 @md:grid-cols-3 @md:divide-x @md:divide-border">
              {[
                { label: 'Cọc tạm giữ', amount: treasury?.quyTamGiuCoc },
                { label: 'Số dư ví chủ trọ', amount: treasury?.tongSoDuViChuTro },
                { label: 'Tiền chờ chi trả', amount: treasury?.quyChoRut },
              ].map(({ label, amount }, index) => (
                <div key={label} className={index === 0 ? '@md:pr-3' : '@md:px-3'}>
                  <dt className="text-[13px] text-text-muted">{label}</dt>
                  <dd className="mt-0.5"><MoneyText amount={amount} className="text-lg font-semibold text-text" /></dd>
                </div>
              ))}
            </dl>
          </Card.Content>
        </Card>

        <Card className="min-w-0 rounded-xl border border-border bg-surface p-5 @lg:p-6">
          <Card.Header className="p-0">
            <Card.Title className="text-base font-semibold text-text">Việc cần xử lý</Card.Title>
          </Card.Header>
          <Card.Content className="mt-3 p-0">
            {pending.length > 0 ? (
              <ul className="divide-y divide-border">
                {pending.map(({ label, count, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-text hover:bg-surface-muted"
                    >
                      <span className="flex-1">{label}</span>
                      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold tabular-nums text-warning-text">{count}</span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex min-h-12 items-center gap-2 text-sm text-text-muted">
                <Check aria-hidden="true" className="size-5 shrink-0" />
                Không có việc chờ xử lý
              </p>
            )}
          </Card.Content>
        </Card>
      </div>

      <dl className="grid gap-4 @sm:grid-cols-2">
        {[
          { label: 'Tổng người dùng', value: stats?.nguoiDung.total ?? 0, Icon: Users },
          { label: 'Tin đăng phòng trọ', value: stats?.soTinDang.total ?? 0, Icon: Building2 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="relative rounded-xl border border-border bg-surface p-5 pr-16">
            <dt className="text-[13px] font-medium text-text-muted">{label}</dt>
            <dd className="mt-1 text-[2rem] leading-[1.1] font-bold tabular-nums text-text">
              {value.toLocaleString('vi-VN')}
            </dd>
            <span className="absolute right-5 top-5 grid size-9 place-items-center rounded-lg bg-surface-muted text-text-muted">
              <Icon aria-hidden="true" className="size-[18px]" />
            </span>
          </div>
        ))}
      </dl>

      <PlatformRevenueChart
        data={stats?.tangTruongGiaoDich ?? []}
        title="Tăng trưởng doanh thu hoa hồng sàn"
        subtitle="Hoa hồng theo tháng từ các giao dịch thuê phòng đã hoàn tất"
      />
    </div>
  );
};
