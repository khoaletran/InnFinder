import React from 'react';
import { Card } from '@heroui/react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminErrorState } from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';

interface RevenuePoint {
  thang: string;
  giaTri: number;
  soLichHoanThanh?: number;
  soLichDat?: number;
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
  const hasAnyActivity = data.some(
    (point) =>
      Number(point.giaTri ?? 0) > 0 ||
      Number(point.soLichDat ?? 0) > 0 ||
      Number(point.soLichHoanThanh ?? 0) > 0,
  );
  const showBookingSeries = data.some(
    (point) => point.soLichDat !== undefined || point.soLichHoanThanh !== undefined,
  );

  return (
    <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs h-full">
      <Card.Header className="p-0 pb-4">
        <Card.Title className="text-sm font-bold text-slate-800">{title}</Card.Title>
        <Card.Description className="text-[11px] text-slate-500 mt-0.5">
          {subtitle}
        </Card.Description>
      </Card.Header>
      <Card.Content className="p-0">
        <div className="w-full h-[280px]">
          {isLoading ? (
            <div className="h-full w-full rounded-xl bg-slate-100/70 animate-pulse flex flex-col justify-between p-4">
              <div className="h-3 w-1/3 bg-slate-200 rounded" />
              <div className="flex items-end gap-3 h-40">
                <div className="flex-1 h-1/3 bg-slate-200 rounded-t-lg" />
                <div className="flex-1 h-1/2 bg-slate-200 rounded-t-lg" />
                <div className="flex-1 h-2/5 bg-slate-200 rounded-t-lg" />
                <div className="flex-1 h-3/4 bg-slate-200 rounded-t-lg" />
                <div className="flex-1 h-2/3 bg-slate-200 rounded-t-lg" />
                <div className="flex-1 h-full bg-slate-200 rounded-t-lg" />
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
          ) : data.length === 0 || !hasAnyActivity ? (
            <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/60 flex flex-col items-center justify-center text-center px-4">
              <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">
                Chưa có doanh thu hoa hồng phát sinh trong kỳ
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Biểu đồ sẽ cập nhật ngay khi có giao dịch thuê phòng hoàn tất.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280} minWidth={0}>
              <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="thang" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${val.toLocaleString('vi-VN')}`
                  }
                />
                {showBookingSeries && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                )}
                <Tooltip
                  formatter={(value: unknown, name: unknown) => {
                    const label = String(name ?? '');
                    if (label === 'giaTri' || label === 'Hoa hồng sàn') {
                      return [formatVND(Number(value ?? 0)), 'Hoa hồng sàn'];
                    }
                    if (label === 'soLichDat' || label === 'Lịch đặt mới') {
                      return [`${Number(value ?? 0)} lịch`, 'Lịch đặt mới'];
                    }
                    return [`${Number(value ?? 0)} lịch`, 'Lịch hoàn tất'];
                  }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                {showBookingSeries && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="giaTri"
                  name="Hoa hồng sàn"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  fillOpacity={0.1}
                  fill="#0d9488"
                  dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 5.5 }}
                />
                {showBookingSeries && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="soLichDat"
                    name="Lịch đặt mới"
                    stroke="#64748b"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
                {showBookingSeries && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="soLichHoanThanh"
                    name="Lịch hoàn tất"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0284c7' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};
