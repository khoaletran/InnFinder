import React from 'react';
import { Card } from '@heroui/react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminErrorState } from '@/components/common/AdminStates';
import { useChartColors } from '@/hooks/useChartColors';
import { formatVND } from '@/utils/formatters';

interface RevenuePoint {
  thang: string;
  giaTri: number;
}

interface PlatformRevenueChartProps {
  data: RevenuePoint[];
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

export const PlatformRevenueChart: React.FC<PlatformRevenueChartProps> = ({
  data,
  title = 'Biểu đồ Doanh thu Hoa hồng Sàn',
  subtitle = 'Tổng phí dịch vụ trích thu từ các giao dịch đặt lịch đã hoàn tất',
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
}) => {
  const colors = useChartColors();
  const hasAnyRevenue = data.some((point) => Number(point.giaTri ?? 0) > 0);

  return (
    <Card className="bg-surface rounded-[var(--radius-card)] border border-border p-5 shadow-[var(--shadow-card)] h-full">
      <Card.Header className="p-0 pb-4">
        <Card.Title className="text-sm font-semibold text-text tracking-[-0.01em]">
          {title}
        </Card.Title>
        <Card.Description className="text-xs text-text-muted mt-0.5">
          {subtitle}
        </Card.Description>
      </Card.Header>
      <Card.Content className="p-0 h-[260px]">
        {isLoading ? (
          <div className="h-full w-full rounded-[var(--radius-control)] bg-surface-muted animate-pulse flex flex-col justify-between p-4">
            <div className="h-3 w-1/3 bg-border-strong rounded" />
            <div className="flex items-end gap-3 h-40">
              <div className="flex-1 h-1/3 bg-border-strong rounded-t-lg" />
              <div className="flex-1 h-1/2 bg-border-strong rounded-t-lg" />
              <div className="flex-1 h-2/5 bg-border-strong rounded-t-lg" />
              <div className="flex-1 h-3/4 bg-border-strong rounded-t-lg" />
              <div className="flex-1 h-2/3 bg-border-strong rounded-t-lg" />
              <div className="flex-1 h-full bg-border-strong rounded-t-lg" />
            </div>
          </div>
        ) : isError ? (
          <div className="h-full flex items-center justify-center">
            <AdminErrorState
              compact
              title="Không thể tải biểu đồ doanh thu"
              message={errorMessage}
              onRetry={onRetry}
            />
          </div>
        ) : data.length === 0 || !hasAnyRevenue ? (
          <div className="h-full rounded-[var(--radius-control)] border border-dashed border-border bg-surface-subtle flex flex-col items-center justify-center text-center px-4">
            <BarChart3 className="w-7 h-7 text-text-subtle mb-2" />
            <p className="text-xs font-medium text-text-secondary">
              Chưa có doanh thu hoa hồng phát sinh trong kỳ
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Biểu đồ sẽ cập nhật ngay khi có giao dịch thuê phòng hoàn tất.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="thang" tick={{ fontSize: 11, fill: colors.textMuted }} />
              <YAxis
                tick={{ fontSize: 11, fill: colors.textMuted }}
                tickFormatter={(val: number) =>
                  val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${val.toLocaleString('vi-VN')}`
                }
              />
              <Tooltip
                formatter={(value: unknown) => [formatVND(Number(value ?? 0)), 'Hoa hồng sàn']}
                contentStyle={{
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.surface,
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="giaTri"
                stroke={colors.primary}
                strokeWidth={2}
                fillOpacity={0.08}
                fill={colors.primary}
                dot={{ r: 3.5, fill: colors.primary, strokeWidth: 2, stroke: colors.surface }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Content>
    </Card>
  );
};
