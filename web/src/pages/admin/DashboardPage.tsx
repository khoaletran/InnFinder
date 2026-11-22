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
  AlertTriangle,
  CircleDollarSign,
} from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { MoneyText } from '@/components/common/MoneyText';
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
        <Card className="min-w-0 rounded-xl border border-border border-t-[3px] border-t-tone-teal-base bg-surface p-5 shadow-[var(--shadow-card)] @lg:p-6">
          <Card.Header className="flex flex-wrap items-start justify-between gap-4 p-0">
            <div className="min-w-0">
              <Card.Title className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-text-muted">
                <span className="grid size-8 place-items-center rounded-lg bg-tone-teal-soft text-tone-teal-base"><Wallet aria-hidden="true" className="size-4" /></span>
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
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-tone-teal-base px-3.5 text-sm font-semibold text-white transition-colors hover:bg-tone-teal-strong"
            >
              Quản lý dòng tiền <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card.Header>

          <Card.Content className="p-0">
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <p className="flex items-center gap-2 text-[13px] text-text-muted"><span className="size-2 rounded-full bg-tone-blue-dot" />Quỹ giữ hộ</p>
                <MoneyText amount={treasury?.tongQuyHeThong} className="text-xl font-semibold text-text" />
              </div>
              <div>
                <p className="flex items-center gap-2 text-[13px] text-text-muted"><span className="size-2 rounded-full bg-tone-teal-dot" />Doanh thu hoa hồng</p>
                <MoneyText amount={treasury?.tongDoanhThu} className="text-xl font-semibold text-tone-teal-base" />
              </div>
            </div>
            <dl className="mt-4 grid gap-y-3 border-t border-border pt-4 @md:grid-cols-3 @md:divide-x @md:divide-border">
              {[
                { label: 'Cọc tạm giữ', amount: treasury?.quyTamGiuCoc, dotClass: 'bg-tone-amber-dot', highlight: false },
                { label: 'Số dư ví chủ trọ', amount: treasury?.tongSoDuViChuTro, dotClass: 'bg-tone-blue-dot', highlight: false },
                { label: 'Tiền chờ chi trả', amount: treasury?.quyChoRut, dotClass: (treasury?.quyChoRut ?? 0) > 0 ? 'bg-tone-amber-dot' : 'bg-tone-slate-dot', highlight: (treasury?.quyChoRut ?? 0) > 0 },
              ].map(({ label, amount, dotClass, highlight }, index) => (
                <div key={label} className={index === 0 ? '@md:pr-3' : '@md:px-3'}>
                  <dt className="flex items-center gap-2 text-[13px] text-text-muted"><span className={`size-2 rounded-full ${dotClass}`} />{label}</dt>
                  <dd className="mt-0.5"><MoneyText amount={amount} className={`text-lg font-semibold ${highlight ? 'text-tone-amber-strong' : 'text-text'}`} /></dd>
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
                      className="flex min-h-12 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-text hover:bg-bg"
                    >
                      <span className={`size-2 shrink-0 rounded-full ${to === '/admin/complaints' ? 'bg-tone-red-dot' : 'bg-tone-amber-dot'}`} />
                      <span className="flex-1">{label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${to === '/admin/complaints' ? 'bg-tone-red-soft text-tone-red-strong' : 'bg-tone-amber-soft text-tone-amber-strong'}`}>{count}</span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center text-center">
                <span className="grid size-10 place-items-center rounded-full bg-tone-green-soft text-tone-green-base"><Check aria-hidden="true" className="size-5" /></span>
                <p className="mt-2 text-[15px] font-semibold text-text">Mọi việc đã được xử lý</p>
                <p className="mt-0.5 text-[13px] text-text-muted">Hiện không có yêu cầu nào đang chờ.</p>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      <dl className="grid gap-4 @sm:grid-cols-2 @4xl:grid-cols-4">
        {[
          { label: 'Tổng người dùng', value: (stats?.nguoiDung.total ?? 0).toLocaleString('vi-VN'), Icon: Users, iconClass: 'bg-tone-blue-soft text-tone-blue-base', valueClass: 'text-text', borderClass: '' },
          { label: 'Tin đăng phòng trọ', value: (stats?.soTinDang.total ?? 0).toLocaleString('vi-VN'), Icon: Building2, iconClass: 'bg-tone-teal-soft text-tone-teal-base', valueClass: 'text-text', borderClass: '' },
          { label: 'Doanh thu hoa hồng', value: formatVND(treasury?.tongDoanhThu), Icon: CircleDollarSign, iconClass: 'bg-tone-green-soft text-tone-green-base', valueClass: 'text-tone-green-strong', borderClass: '' },
          { label: 'Khiếu nại chờ duyệt', value: String(stats?.khieuNai.total ?? 0), Icon: AlertTriangle, iconClass: (stats?.khieuNai.total ?? 0) > 0 ? 'bg-tone-red-soft text-tone-red-base' : 'bg-tone-slate-soft text-tone-slate-base', valueClass: (stats?.khieuNai.total ?? 0) > 0 ? 'text-tone-red-strong' : 'text-text', borderClass: (stats?.khieuNai.total ?? 0) > 0 ? 'border-l-[3px] border-l-tone-red-base' : '' },
        ].map(({ label, value, Icon, iconClass, valueClass, borderClass }) => (
          <div key={label} className={`relative rounded-xl border border-border bg-surface p-5 pr-16 transition-all hover:border-border-strong hover:shadow-[var(--shadow-card-hover)] ${borderClass}`}>
            <dt className="text-[13px] font-medium text-text-muted">{label}</dt>
            <dd className={`mt-1 text-[clamp(1.4rem,2cqi,2rem)] leading-[1.1] font-bold tabular-nums ${valueClass}`}>
              {value}
            </dd>
            {label === 'Khiếu nại chờ duyệt' && (stats?.khieuNai.total ?? 0) > 0 && <span className="mt-2 inline-block rounded-md bg-tone-red-soft px-2 py-0.5 text-xs font-semibold text-tone-red-strong">Cần xử lý</span>}
            <span className={`absolute right-5 top-5 grid size-10 place-items-center rounded-[10px] ${iconClass}`}>
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
