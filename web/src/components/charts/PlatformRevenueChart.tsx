import React from 'react';
import { Card } from '@heroui/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVND } from '@/utils/formatters';

interface RevenuePoint {
  thang: string;
  giaTri: number;
}

interface PlatformRevenueChartProps {
  data: RevenuePoint[];
  title?: string;
  subtitle?: string;
}

export const PlatformRevenueChart: React.FC<PlatformRevenueChartProps> = ({
  data,
  title = 'Biểu đồ doanh thu hoa hồng',
  subtitle = 'Doanh thu hoa hồng từ các lịch xem phòng đã hoàn tất',
}) => {
  return (
    <Card className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
      <Card.Header className="pb-4">
        <Card.Title className="text-sm font-bold text-slate-800">{title}</Card.Title>
        <Card.Description className="text-[11px] text-slate-500 mt-0.5">
          {subtitle}
        </Card.Description>
      </Card.Header>
      <Card.Content className="p-0">
        {data.length > 0 ? (
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height={260} minWidth={0}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="platformRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="thang" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val: number) =>
                    val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}M` : `${val.toLocaleString('vi-VN')}`
                  }
                />
                <Tooltip
                  formatter={(value: unknown) => [formatVND(Number(value ?? 0)), 'Doanh thu hoa hồng']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="giaTri"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#platformRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full h-[260px] flex items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn.
          </div>
        )}
      </Card.Content>
    </Card>
  );
};
