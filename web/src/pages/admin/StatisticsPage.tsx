import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Download,
  Minus,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
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
import type { AdminRevenueInsightResponse, AdminStatisticsFilter } from '@/types/admin.types';
import { adminService } from '@/services/admin.service';
import { PlatformRevenueChart } from './StatisticsRevenueChart';
import { AdminErrorState, AdminRefreshButton } from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';

const PIE_COLORS = ['#0d9488', '#0f766e', '#10b981', '#f59e0b', '#64748b', '#06b6d4'];

type QuickBadgeTone = 'emerald' | 'rose' | 'amber' | 'blue' | 'slate';

interface QuickInsightItem {
  key: string;
  title: string;
  badgeText: string;
  tone: QuickBadgeTone;
  headline: string;
  detail: string;
}

const TONE_CLASSES: Record<QuickBadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PRIORITY_STYLES: Record<'CAO' | 'TRUNG_BINH' | 'THEO_DOI', { label: string; className: string }> = {
  CAO: {
    label: 'Ưu tiên cao',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  TRUNG_BINH: {
    label: 'Nên thực hiện',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  THEO_DOI: {
    label: 'Theo dõi',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

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

function renderToneIcon(tone: QuickBadgeTone) {
  if (tone === 'emerald') return <TrendingUp className="w-3.5 h-3.5" />;
  if (tone === 'rose') return <TrendingDown className="w-3.5 h-3.5" />;
  if (tone === 'amber') return <AlertTriangle className="w-3.5 h-3.5" />;
  return <Minus className="w-3.5 h-3.5" />;
}

export const StatisticsPage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const {
    data: stats,
    isLoading,
    isFetching,
    isError,
    error,
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

  const [insightsByPeriod, setInsightsByPeriod] = useState<Record<string, AdminRevenueInsightResponse>>({});
  const insightFilters: AdminStatisticsFilter = { day: selectedDay, month: selectedMonth, year: selectedYear };
  const currentInsight = insightsByPeriod[JSON.stringify(insightFilters)];

  const insightMutation = useMutation({
    mutationFn: (filters: AdminStatisticsFilter) => adminService.generateRevenueInsights(filters),
    onSuccess: (res, filters) => {
      setInsightsByPeriod((previous) => ({ ...previous, [JSON.stringify(filters)]: res }));
      toast.success(
        res.nguonPhanTich === 'AI'
          ? 'Đã phân tích bằng AI'
          : 'Đã tổng hợp đánh giá và đề xuất từ số liệu hệ thống',
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Không thể phân tích dữ liệu lúc này, vui lòng thử lại');
    },
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
    insightMutation.reset();
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
    insightMutation.reset();
    setSelectedDay(val ? Number(val) : null);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const nextMonth = val ? Number(val) : null;
    insightMutation.reset();
    setSelectedMonth(nextMonth);
    const nextMax = getMaxDaysInMonth(nextMonth, selectedYear);
    if (selectedDay !== null && selectedDay > nextMax) {
      setSelectedDay(nextMax);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const nextYear = val ? Number(val) : null;
    insightMutation.reset();
    setSelectedYear(nextYear);
    const nextMax = getMaxDaysInMonth(selectedMonth, nextYear);
    if (selectedDay !== null && selectedDay > nextMax) {
      setSelectedDay(nextMax);
    }
  };

  const handleResetFilters = () => {
    insightMutation.reset();
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

  const quickInsights = useMemo<QuickInsightItem[]>(() => {
    if (!stats) return [];

    // 1. Xu hướng biểu đồ doanh thu
    const points = stats.bieuDoDoanhThu ?? [];
    const latest = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : undefined;
    const peak = points.reduce<(typeof points)[number] | null>(
      (best, cur) => (!best || cur.doanhThu > best.doanhThu ? cur : best),
      null,
    );
    const avgPerBooking =
      stats.soLichHoanThanh > 0 ? Math.round(stats.tongDoanhThu / stats.soLichHoanThanh) : 0;

    let revTone: QuickBadgeTone = 'slate';
    let revBadge = 'Ổn định';
    let revHeadline = 'Chưa phát sinh doanh thu';
    let revDetail = 'Chưa có lịch hẹn hoàn tất ghi nhận hoa hồng trong kỳ lọc này.';

    if (stats.tongDoanhThu > 0 && latest) {
      if (prev) {
        const delta = latest.doanhThu - prev.doanhThu;
        if (delta > 0) {
          const pct =
            prev.doanhThu > 0
              ? `+${((delta * 100) / prev.doanhThu).toFixed(1)}%`
              : 'Tăng mới';
          revTone = 'emerald';
          revBadge = `Tăng ${pct}`;
          revHeadline = `${latest.nhan}: ${formatVND(latest.doanhThu)}`;
          revDetail = `Tăng ${formatVND(delta)} so với ${prev.nhan}. Bình quân ${formatVND(avgPerBooking)}/lịch hoàn tất.`;
        } else if (delta < 0) {
          const pct =
            prev.doanhThu > 0 ? `${((delta * 100) / prev.doanhThu).toFixed(1)}%` : 'Giảm';
          revTone = 'rose';
          revBadge = `Giảm ${pct}`;
          revHeadline = `${latest.nhan}: ${formatVND(latest.doanhThu)}`;
          revDetail = `Giảm ${formatVND(Math.abs(delta))} so với ${prev.nhan}. Đỉnh cao nhất ở ${peak?.nhan ?? latest.nhan}.`;
        } else {
          revTone = 'slate';
          revBadge = 'Đi ngang';
          revHeadline = `${latest.nhan}: ${formatVND(latest.doanhThu)}`;
          revDetail = `Giữ nguyên so với ${prev.nhan}. Bình quân ${formatVND(avgPerBooking)}/lịch hoàn tất.`;
        }
      } else {
        revTone = 'emerald';
        revBadge = 'Có phát sinh';
        revHeadline = formatVND(stats.tongDoanhThu);
        revDetail = `${stats.soLichHoanThanh} lịch hoàn tất, bình quân ${formatVND(avgPerBooking)}/lịch.`;
      }
    }

    // 2. Ngân khố & thanh khoản
    const totalVault = stats.tongQuyThucTe || stats.tongQuyHeThong + stats.tongDoanhThu;
    const fundShare =
      totalVault > 0 ? ((stats.tongDoanhThu * 100) / totalVault).toFixed(1) : '0.0';

    let fundTone: QuickBadgeTone = 'slate';
    let fundBadge = 'Chưa phát sinh';
    let fundHeadline = formatVND(totalVault);
    let fundDetail = 'Chưa có cọc tạm giữ hoặc giao dịch ví phát sinh trong kỳ.';

    if (stats.soLenhRutChoDuyet > 0) {
      fundTone = 'amber';
      fundBadge = `${stats.soLenhRutChoDuyet} lệnh chờ duyệt`;
      fundHeadline = `Chờ rút: ${formatVND(stats.quyChoRut)}`;
      fundDetail = `Hoa hồng chiếm ${fundShare}% két thực tế (${formatVND(totalVault)}); ví chủ trọ hiện tại ${formatVND(stats.tongSoDuViChuTro)}.`;
    } else if (totalVault > 0) {
      fundTone = 'emerald';
      fundBadge = 'Thanh khoản ổn';
      fundHeadline = `Hoa hồng ${fundShare}% két`;
      fundDetail = `Cọc tạm giữ ${formatVND(stats.quyTamGiuCoc)} · Ví chủ trọ ${formatVND(stats.tongSoDuViChuTro)} · Không tồn đọng lệnh rút.`;
    }

    // 3. Cơ cấu loại phòng
    const topType = stats.coCauLoaiPhong[0];
    const topPct =
      topType && stats.tongSoPhong > 0
        ? ((topType.soLuong * 100) / stats.tongSoPhong).toFixed(1)
        : '0.0';

    let roomTone: QuickBadgeTone = 'slate';
    let roomBadge = 'Chưa có tin';
    let roomHeadline = `${stats.tongSoPhong} phòng trọ`;
    let roomDetail = 'Chưa có bài đăng phòng trọ mới trong kỳ lọc này.';

    if (stats.tongSoPhong > 0 && topType) {
      if (stats.soPhongChoDuyet > 0) {
        roomTone = 'amber';
        roomBadge = `${stats.soPhongChoDuyet} phòng chờ duyệt`;
      } else if (Number(topPct) >= 60) {
        roomTone = 'blue';
        roomBadge = 'Tập trung cao';
      } else {
        roomTone = 'emerald';
        roomBadge = 'Phân bổ đều';
      }
      roomHeadline = `${topType.tenLoaiPhong} (${topPct}%)`;
      const smallestType =
        stats.coCauLoaiPhong.length >= 2
          ? stats.coCauLoaiPhong[stats.coCauLoaiPhong.length - 1]
          : null;
      roomDetail = smallestType
        ? `Chiếm ${topType.soLuong}/${stats.tongSoPhong} phòng; ít nhất là ${smallestType.tenLoaiPhong} (${smallestType.soLuong} phòng).`
        : `Tất cả ${stats.tongSoPhong} phòng thuộc nhóm ${topType.tenLoaiPhong}.`;
    }

    return [
      {
        key: 'revenue',
        title: 'Biểu đồ doanh thu',
        badgeText: revBadge,
        tone: revTone,
        headline: revHeadline,
        detail: revDetail,
      },
      {
        key: 'treasury',
        title: 'Ngân khố & dòng tiền',
        badgeText: fundBadge,
        tone: fundTone,
        headline: fundHeadline,
        detail: fundDetail,
      },
      {
        key: 'room-mix',
        title: 'Cơ cấu loại phòng',
        badgeText: roomBadge,
        tone: roomTone,
        headline: roomHeadline,
        detail: roomDetail,
      },
    ];
  }, [stats]);

  const handleExportReport = () => {
    if (!stats) {
      toast.error('Chưa có dữ liệu để xuất báo cáo');
      return;
    }

    const aiInsight = currentInsight;
    const rows: Array<Array<string | number>> = [
      ['BÁO CÁO THỐNG KÊ DOANH THU & NGÂN KHỐ INNFINDER'],
      ['Kỳ thống kê', activePeriodLabel],
      ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
      [],
      ['I. TỔNG QUAN CHỈ SỐ', 'Giá trị'],
      ['Doanh thu hoa hồng (VNĐ)', stats.tongDoanhThu],
      ['Số lịch hẹn hoàn tất', stats.soLichHoanThanh],
      ['Tổng quỹ luân chuyển (VNĐ)', stats.tongQuyHeThong],
      ['Tổng két thực tế (VNĐ)', stats.tongQuyThucTe],
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

    if (aiInsight) {
      rows.push(
        [],
        ['IV. ĐÁNH GIÁ & ĐỀ XUẤT QUYẾT ĐỊNH', 'Nội dung'],
        ['Tổng quan', aiInsight.tongQuan],
        ['Đánh giá doanh thu', aiInsight.danhGiaDoanhThu],
        ['Đánh giá ngân khố', aiInsight.danhGiaNganKho],
        ['Đánh giá loại phòng', aiInsight.danhGiaLoaiPhong],
        [],
        ['Đề xuất quyết định', 'Mức ưu tiên', 'Chi tiết hành động'],
        ...aiInsight.deXuatQuyetDinh.map((act) => [act.tieuDe, act.mucDoUuTien, act.moTa]),
      );
    }

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
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-64 bg-slate-200 rounded-lg" />
            <div className="h-3.5 w-80 bg-slate-200/80 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-200 rounded-xl" />
            <div className="h-9 w-36 bg-slate-200 rounded-xl" />
          </div>
        </div>
        <div className="h-14 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-white rounded-2xl border border-slate-200 p-5" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (isError && !stats) {
    const errMsg =
      (error instanceof Error && error.message) ||
      'Không thể tải báo cáo thống kê doanh thu và ngân khố sàn.';
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Thống kê doanh thu & ngân khố
          </h1>
          <AdminRefreshButton onClick={() => void refetch()} isRefreshing={isFetching} />
        </div>
        <AdminErrorState
          title="Không thể tải dữ liệu thống kê"
          message={errMsg}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const aiInsight = currentInsight;

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
          <AdminRefreshButton
            onClick={() => void refetch()}
            isRefreshing={isFetching}
            label="Đồng bộ dữ liệu"
          />
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
          <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">Kỳ lọc</span>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold border border-teal-200/70">
            {activePeriodLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Chọn nhanh theo lịch"
            value={dateInputValue}
            onChange={handleDateInputChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-colors"
          />

          <select
            aria-label="Lọc theo ngày"
            value={selectedDay ?? ''}
            onChange={handleDayChange}
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-teal-500 cursor-pointer transition-colors"
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
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-teal-500 cursor-pointer transition-colors"
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
            className="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-teal-500 cursor-pointer transition-colors"
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
              <div className="text-2xl font-black text-teal-700 tracking-tight tabular-nums">
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
              <span className="text-xs font-semibold text-slate-500">Tổng quỹ luân chuyển</span>
              <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                {formatVND(stats?.tongQuyHeThong ?? 0)}
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Tổng két thực tế: {formatVND(stats?.tongQuyThucTe ?? 0)} (gồm hoa hồng)
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
              <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
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
          isLoading={isLoading && !stats}
          isError={isError}
          onRetry={() => void refetch()}
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
                  <Bar dataKey="soTien" fill="#0d9488" radius={[8, 8, 0, 0]} maxBarSize={56} />
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

      {/* Chart Evaluation & Decision Recommendations (Instant Quick Summary + On-Demand AI) */}
      <Card
        style={{ animationDelay: '360ms' }}
        className="animate-fade-up bg-white rounded-2xl border border-slate-200 p-6 shadow-xs"
      >
        <Card.Header className="p-0 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900">
              Nhận định & hành động
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Tóm tắt theo kỳ lọc ({activePeriodLabel})
            </Card.Description>
          </div>

          <button
            type="button"
            onClick={() => insightMutation.mutate(insightFilters)}
            disabled={insightMutation.isPending || !stats || isFetching}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${insightMutation.isPending ? 'animate-spin' : ''}`} />
            <span>
              {insightMutation.isPending
                ? 'Đang phân tích dữ liệu...'
                : aiInsight
                  ? 'Phân tích lại bằng AI'
                  : 'Phân tích bằng AI'}
            </span>
          </button>
        </Card.Header>

        <Card.Content className="p-0">
          <div className="space-y-5">
            {insightMutation.isPending && <p role="status" className="text-xs text-teal-700">Đang tổng hợp nhận định. Bạn có thể tiếp tục xem các số liệu bên trên.</p>}
            {insightMutation.isError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{insightMutation.error.message}{aiInsight ? ' Kết quả lần trước vẫn được giữ bên dưới.' : ''}</p>}
            {/* Instant Rule-Based Evaluation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickInsights.map((item) => (
                <div
                  key={item.key}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">{item.title}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold shrink-0 ${TONE_CLASSES[item.tone]}`}
                    >
                      {renderToneIcon(item.tone)}
                      <span>{item.badgeText}</span>
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">{item.headline}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            {/* On-Demand AI Deep Analysis & Recommended Decisions */}
            {aiInsight && (
              <div className="animate-fade-up pt-4 border-t border-slate-200 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/80 to-blue-50/70 border border-teal-200/70 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Nhận định tổng hợp</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-teal-200 text-[10px] font-bold text-teal-700">
                      {aiInsight.nguonPhanTich === 'AI'
                        ? 'Phân tích AI Gemini'
                        : 'Phân tích tự động'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {aiInsight.tongQuan}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Quyết định đề xuất</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiInsight.deXuatQuyetDinh.slice(0, 2).map((action, idx) => {
                      const priorityStyle =
                        PRIORITY_STYLES[action.mucDoUuTien] ?? PRIORITY_STYLES.TRUNG_BINH;
                      return (
                        <div
                          key={`${action.tieuDe}-${idx}`}
                          className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/90 flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {action.tieuDe}
                              </h4>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${priorityStyle.className}`}
                              >
                                {priorityStyle.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{action.moTa}</p>
                          </div>

                          {action.duongDan && (
                            <div className="pt-1 flex justify-end">
                              <Link
                                to={action.duongDan}
                                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                              >
                                <span>Xử lý ngay</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <details className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-teal-700">Xem thêm nhận định</summary>
                  <div className="pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-blue-700">Biến động doanh thu</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {aiInsight.danhGiaDoanhThu}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-emerald-700">Đánh giá ngân khố</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {aiInsight.danhGiaNganKho}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-indigo-700">Nguồn cung loại phòng</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {aiInsight.danhGiaLoaiPhong}
                    </p>
                  </div>
                </div>

                  </div>
                </details>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
