import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Spinner } from '@heroui/react';
import { Calendar, Download, RefreshCw, RotateCcw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from '@/components/charts/PlatformRevenueChart';
import { formatVND } from '@/utils/formatters';

const PIE_COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

function getMaxDaysInMonth(month: number | null, year: number | null): number {
  if (month !== null && year !== null) {
    return new Date(year, month, 0).getDate();
  }
  if (month === 2) return 29;
  if (month !== null && [4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function pad2(val: number): string {
  return String(val).padStart(2, '0');
}

function formatPeriodLabel(
  day: number | null,
  month: number | null,
  year: number | null,
): string {
  if (day !== null && month !== null && year !== null) {
    return `Ngày ${pad2(day)}/${pad2(month)}/${year}`;
  }
  if (day === null && month !== null && year !== null) {
    return `Tháng ${pad2(month)}/${year}`;
  }
  if (day === null && month === null && year !== null) {
    return `Năm ${year}`;
  }
  if (day !== null && month !== null && year === null) {
    return `Ngày ${pad2(day)}/${pad2(month)} (tất cả năm)`;
  }
  if (day !== null && month === null && year !== null) {
    return `Ngày ${pad2(day)} hàng tháng · Năm ${year}`;
  }
  if (day === null && month !== null && year === null) {
    return `Tháng ${pad2(month)} (tất cả năm)`;
  }
  if (day !== null && month === null && year === null) {
    return `Ngày ${pad2(day)} hàng tháng (tất cả năm)`;
  }
  return 'Toàn thời gian';
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildExportFilename(
  day: number | null,
  month: number | null,
  year: number | null,
): string {
  if (day === null && month === null && year === null) {
    return 'bao-cao-doanh-thu-innfinder-toan-thoi-gian.csv';
  }
  const parts = [
    year ? String(year) : 'tat-ca-nam',
    month ? pad2(month) : 'tat-ca-thang',
    day ? pad2(day) : 'tat-ca-ngay',
  ];
  return `bao-cao-doanh-thu-innfinder-${parts.join('-')}.csv`;
}

export const StatisticsPage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const {
    data: stats,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'admin',
      'statistics',
      selectedDay ?? 'all',
      selectedMonth ?? 'all',
      selectedYear ?? 'all',
    ],
    queryFn: () =>
      adminService.getStatistics({
        day: selectedDay,
        month: selectedMonth,
        year: selectedYear,
      }),
    placeholderData: (previousData) => previousData,
  });

  const maxDays = getMaxDaysInMonth(selectedMonth, selectedYear);

  const dateInputValue = useMemo(() => {
    if (
      selectedDay !== null &&
      selectedMonth !== null &&
      selectedYear !== null &&
      selectedDay <= maxDays
    ) {
      return `${selectedYear}-${pad2(selectedMonth)}-${pad2(selectedDay)}`;
    }
    return '';
  }, [selectedDay, selectedMonth, selectedYear, maxDays]);

  const dbYears = stats?.cacNamCoDuLieu;
  const yearOptions = useMemo(() => {
    const baseYears =
      dbYears && dbYears.length > 0 ? [...dbYears] : [new Date().getFullYear()];
    if (selectedYear !== null && !baseYears.includes(selectedYear)) {
      baseYears.push(selectedYear);
      baseYears.sort((a, b) => b - a);
    }
    return baseYears;
  }, [dbYears, selectedYear]);

  const dayOptions = useMemo(
    () => Array.from({ length: maxDays }, (_, idx) => idx + 1),
    [maxDays],
  );

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, idx) => idx + 1), []);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      setSelectedDay(null);
      setSelectedMonth(null);
      setSelectedYear(null);
      return;
    }
    const parts = raw.split('-');
    if (parts.length !== 3) return;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDay(val ? Number(val) : null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const nextMonth = val ? Number(val) : null;
    setSelectedMonth(nextMonth);
    const nextMax = getMaxDaysInMonth(nextMonth, selectedYear);
    if (selectedDay !== null && selectedDay > nextMax) {
      setSelectedDay(nextMax);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const nextYear = val ? Number(val) : null;
    setSelectedYear(nextYear);
    const nextMax = getMaxDaysInMonth(selectedMonth, nextYear);
    if (selectedDay !== null && selectedDay > nextMax) {
      setSelectedDay(nextMax);
    }
  };

  const handleResetFilters = () => {
    setSelectedDay(null);
    setSelectedMonth(null);
    setSelectedYear(null);
  };

  const hasActiveFilter =
    selectedDay !== null || selectedMonth !== null || selectedYear !== null;

  const activePeriodLabel = useMemo(
    () => formatPeriodLabel(selectedDay, selectedMonth, selectedYear),
    [selectedDay, selectedMonth, selectedYear],
  );

  const handleExportReport = () => {
    if (!stats) {
      toast.error('Chưa có dữ liệu để xuất báo cáo');
      return;
    }

    const rows: Array<Array<string | number>> = [
      ['BÁO CÁO THỐNG KÊ DOANH THU & NGÂN KHỐ INNFINDER'],
      ['Kỳ thống kê', activePeriodLabel],
      ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
      [],
      ['I. TỔNG QUAN CHỈ SỐ', 'Giá trị'],
      ['Doanh thu hoa hồng (VNĐ)', stats.tongDoanhThu],
      ['Số lịch hẹn hoàn tất', stats.soLichHoanThanh],
      ['Tổng quỹ hệ thống (VNĐ)', stats.tongQuyHeThong],
      ['Cọc tạm giữ (VNĐ)', stats.quyTamGiuCoc],
      ['Số dư ví chủ trọ (VNĐ)', stats.tongSoDuViChuTro],
      ['Quỹ chờ rút (VNĐ)', stats.quyChoRut],
      ['Số lệnh rút chờ duyệt', stats.soLenhRutChoDuyet],
      ['Tổng phòng trọ', stats.tongSoPhong],
      ['Phòng đang hiển thị', stats.soPhongDaDuyet],
      ['Phòng chờ duyệt', stats.soPhongChoDuyet],
      ['Phòng đã hoàn thành', stats.soPhongHoanThanh],
      ['Tổng người dùng', stats.tongNguoiDung],
      ['Chủ trọ', stats.soChuTro],
      [],
      ['II. DOANH THU HOA HỒNG THEO MỐC THỜI GIAN', 'Doanh thu hoa hồng (VNĐ)', 'Số lịch hoàn tất'],
      ...stats.bieuDoDoanhThu.map((point) => [
        point.nhan,
        point.doanhThu,
        point.soLichHoanThanh,
      ]),
      [],
      ['III. CƠ CẤU LOẠI PHÒNG TRỌ', 'Số lượng phòng'],
      ...stats.coCauLoaiPhong.map((item) => [item.tenLoaiPhong, item.soLuong]),
    ];

    const csvContent =
      '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildExportFilename(selectedDay, selectedMonth, selectedYear);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất báo cáo thống kê thành công');
  };

  const revenueChartData = useMemo(
    () =>
      (stats?.bieuDoDoanhThu ?? []).map((point) => ({
        thang: point.nhan,
        giaTri: point.doanhThu,
      })),
    [stats?.bieuDoDoanhThu],
  );

  const treasuryBreakdownData = useMemo(
    () => [
      {
        danhMuc: 'Doanh thu hoa hồng',
        soTien: stats?.tongDoanhThu ?? 0,
      },
      {
        danhMuc: 'Cọc tạm giữ',
        soTien: stats?.quyTamGiuCoc ?? 0,
      },
      {
        danhMuc: 'Ví chủ trọ',
        soTien: stats?.tongSoDuViChuTro ?? 0,
      },
      {
        danhMuc: 'Quỹ chờ rút',
        soTien: stats?.quyChoRut ?? 0,
      },
    ],
    [stats],
  );

  const roomTypeDistribution = useMemo(
    () =>
      (stats?.coCauLoaiPhong ?? []).map((item, idx) => ({
        name: item.tenLoaiPhong,
        value: item.soLuong,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      })),
    [stats?.coCauLoaiPhong],
  );

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <Spinner size="lg" />
        <span className="text-xs font-medium">Đang tải dữ liệu thống kê doanh thu...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Thống kê doanh thu & ngân khố
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi doanh thu hoa hồng, cơ cấu phòng trọ và tình hình quỹ hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportReport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Compact Single-Row Filter Toolbar */}
      <div
        style={{ animationDelay: '0ms' }}
        className="animate-fade-up px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Kỳ lọc</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200/70">
            {activePeriodLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Chọn nhanh theo lịch"
            value={dateInputValue}
            onChange={handleDateInputChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />

          <select
            aria-label="Lọc theo ngày"
            value={selectedDay ?? ''}
            onChange={handleDayChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="">Tất cả ngày</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                Ngày {d}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo tháng"
            value={selectedMonth ?? ''}
            onChange={handleMonthChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="">Tất cả tháng</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc theo năm"
            value={selectedYear ?? ''}
            onChange={handleYearChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="">Tất cả năm</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Centered Icon-Free KPI Row with Staggered Entrance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          style={{ animationDelay: '60ms' }}
          className="animate-fade-up p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <Card.Content className="p-0">
            <div className="flex flex-col items-center justify-center text-center py-1 gap-1">
              <span className="text-xs font-semibold text-slate-500">Doanh thu hoa hồng</span>
              <div className="text-2xl font-black text-blue-600 tracking-tight">
                {formatVND(stats?.tongDoanhThu ?? 0)}
              </div>
              <span className="text-[11px] text-slate-500">
                {(stats?.soLichHoanThanh ?? 0).toLocaleString('vi-VN')} lịch hẹn đã hoàn tất
              </span>
            </div>
          </Card.Content>
        </Card>

        <Card
          style={{ animationDelay: '120ms' }}
          className="animate-fade-up p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <Card.Content className="p-0">
            <div className="flex flex-col items-center justify-center text-center py-1 gap-1">
              <span className="text-xs font-semibold text-slate-500">Tổng quỹ hệ thống</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {formatVND(stats?.tongQuyHeThong ?? 0)}
              </div>
              <span className="text-[11px] text-slate-500">
                Cọc tạm giữ, ví chủ trọ & quỹ chờ rút
              </span>
            </div>
          </Card.Content>
        </Card>

        <Card
          style={{ animationDelay: '180ms' }}
          className="animate-fade-up p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
        >
          <Card.Content className="p-0">
            <div className="flex flex-col items-center justify-center text-center py-1 gap-1">
              <span className="text-xs font-semibold text-slate-500">Tổng phòng trọ</span>
              <div className="text-2xl font-black text-indigo-600 tracking-tight">
                {(stats?.tongSoPhong ?? 0).toLocaleString('vi-VN')} phòng
              </div>
              <span className="text-[11px] text-slate-500">
                Đang hiển thị: {(stats?.soPhongDaDuyet ?? 0).toLocaleString('vi-VN')} · Chờ duyệt:{' '}
                {(stats?.soPhongChoDuyet ?? 0).toLocaleString('vi-VN')}
              </span>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Chart 1: Revenue Time Series */}
      <div style={{ animationDelay: '240ms' }} className="animate-fade-up">
        <PlatformRevenueChart
          data={revenueChartData}
          title="Biểu đồ doanh thu hoa hồng"
          subtitle={`Thống kê doanh thu hoa hồng theo kỳ lọc (${activePeriodLabel})`}
        />
      </div>

      {/* Chart 2 & Chart 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card
          style={{ animationDelay: '300ms' }}
          className="animate-fade-up lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs"
        >
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Cơ cấu doanh thu & quỹ hệ thống
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Phân bổ doanh thu hoa hồng, tiền cọc tạm giữ, số dư ví chủ trọ và quỹ chờ rút (
              {activePeriodLabel})
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0">
            <div className="w-full h-[260px]">
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <BarChart
                  data={treasuryBreakdownData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="danhMuc" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val: number) =>
                      val >= 1_000_000
                        ? `${(val / 1_000_000).toFixed(1)}M`
                        : `${val.toLocaleString('vi-VN')}`
                    }
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatVND(Number(val ?? 0)), 'Số tiền']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="soTien" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        <Card
          style={{ animationDelay: '300ms' }}
          className="animate-fade-up lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col"
        >
          <Card.Header className="p-0 pb-4">
            <Card.Title className="text-sm font-bold text-slate-900">
              Cơ cấu loại phòng trọ
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Phân bổ theo {(stats?.tongSoPhong ?? 0).toLocaleString('vi-VN')} phòng trọ trong kỳ (
              {activePeriodLabel})
            </Card.Description>
          </Card.Header>

          <Card.Content className="p-0">
            <div className="w-full h-[260px] flex items-center justify-center">
              {roomTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={260} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={roomTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {roomTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${Number(val ?? 0)} phòng`, 'Số lượng']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  Chưa có dữ liệu phòng trọ trong khoảng thời gian đã chọn.
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};
