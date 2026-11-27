import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '@heroui/react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Cpu,
  Download,
  Filter,
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
import { AdminErrorState } from '@/components/common/AdminStates';
import { formatVND } from '@/utils/formatters';

const PIE_COLORS = ['#0d9488', '#0f766e', '#10b981', '#f59e0b', '#64748b', '#06b6d4'];

type AdminStatsTab = 'overview' | 'funnel' | 'ai';
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
    return 'bao-cao-thong-ke-innfinder-toan-thoi-gian.csv';
  }
  const parts = [
    year ? String(year) : 'tat-ca-nam',
    month ? pad2(month) : 'tat-ca-thang',
    day ? pad2(day) : 'tat-ca-ngay',
  ];
  return `bao-cao-thong-ke-innfinder-${parts.join('-')}.csv`;
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
  const [activeTab, setActiveTab] = useState<AdminStatsTab>('overview');
  const [roomMixView, setRoomMixView] = useState<'matrix' | 'pie'>('matrix');

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
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Không thể phân tích dữ liệu lúc này, vui lòng thử lại');
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

    const points = stats.bieuDoDoanhThu ?? [];
    const latest = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : undefined;
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
          revDetail = `Giảm ${formatVND(Math.abs(delta))} so với ${prev.nhan}. Cần rà soát nguồn cung & phễu đặt cọc.`;
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

    const funnel = stats.pheuChuyenDoi;
    let funnelTone: QuickBadgeTone = 'slate';
    let funnelBadge = 'Chưa có dữ liệu';
    let funnelHeadline = 'Chưa phát sinh phễu lịch';
    let funnelDetail = 'Chưa có lịch hẹn đặt cọc trong kỳ lọc này.';
    if (funnel && funnel.soLichDatCoc > 0) {
      const rate = funnel.tyLeChotTuDatLichPercent;
      funnelTone = rate >= 50 ? 'emerald' : rate >= 25 ? 'blue' : 'amber';
      funnelBadge = `Chốt ${rate}%`;
      funnelHeadline = `${funnel.soLichHoanThanh}/${funnel.soLichDatCoc} lịch chốt thuê`;
      funnelDetail = `Xem thực tế ${funnel.soLichDaXem} lịch · Khách từ chối ${funnel.soLichKhachTuChoi} · No-show ${funnel.soCaNoShow}.`;
    } else if (funnel && (funnel.luotXemChiTiet > 0 || funnel.luotHienThiGoiY > 0)) {
      funnelTone = 'blue';
      funnelBadge = `CTR ${funnel.ctrGoiYPercent}%`;
      funnelHeadline = `${funnel.luotXemChiTiet} lượt xem phòng`;
      funnelDetail = `${funnel.luotHienThiGoiY} hiển thị gợi ý · ${funnel.luotXemTour360} lượt xem Tour 360° · ${funnel.luotYeuThich} yêu thích.`;
    }

    const ai = stats.tongQuanAiTracking;
    let aiTone: QuickBadgeTone = 'slate';
    let aiBadge = 'Theo dõi';
    let aiHeadline = 'AI & Tracking';
    let aiDetail = 'Chưa có dữ liệu gọi AI hoặc lập chỉ mục Vector.';
    if (ai) {
      aiTone = ai.vectorCoveragePercent >= 85 && !ai.quotaWarning ? 'emerald' : 'amber';
      aiBadge = `Vector ${ai.vectorCoveragePercent}%`;
      aiHeadline = ai.pricingConfigured
        ? `Chi phí AI: ${formatVND(ai.chiPhiUocTinhVnd)}`
        : `${ai.tongLuotGoiProvider + ai.tongLuotBypass} lượt AI`;
      aiDetail = `Bypass tiết kiệm ${ai.tyLeTietKiemBypassPercent}% · Biên sau AI: ${formatVND(ai.bienLoiNhuanSauAiVnd)} · ${ai.indexedRooms}/${ai.totalApprovedRooms} phòng đã index.`;
    }

    return [
      {
        key: 'revenue',
        title: 'Doanh thu hoa hồng',
        badgeText: revBadge,
        tone: revTone,
        headline: revHeadline,
        detail: revDetail,
      },
      {
        key: 'funnel',
        title: 'Phễu đặt lịch & chốt thuê',
        badgeText: funnelBadge,
        tone: funnelTone,
        headline: funnelHeadline,
        detail: funnelDetail,
      },
      {
        key: 'ai-roi',
        title: 'Hiệu suất AI & Vector',
        badgeText: aiBadge,
        tone: aiTone,
        headline: aiHeadline,
        detail: aiDetail,
      },
    ];
  }, [stats]);

  const handleExportReport = () => {
    if (!stats) {
      toast.error('Chưa có dữ liệu để xuất báo cáo');
      return;
    }

    const aiInsight = currentInsight;
    const funnel = stats.pheuChuyenDoi;
    const ai = stats.tongQuanAiTracking;

    const rows: Array<Array<string | number>> = [
      ['BÁO CÁO THỐNG KÊ DOANH THU, PHỄU CHUYỂN ĐỔI & TRACKING INNFINDER'],
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
      ['II. PHỄU CHUYỂN ĐỔI TRACKING -> CHỐT THUÊ', 'Số lượng'],
      ['Lượt tìm kiếm AI', funnel?.luotTimKiemAi ?? 0],
      ['Hiển thị gợi ý phòng', funnel?.luotHienThiGoiY ?? 0],
      ['Click gợi ý phòng', funnel?.luotClickGoiY ?? 0],
      ['CTR gợi ý (%)', funnel?.ctrGoiYPercent ?? 0],
      ['Lượt xem chi tiết phòng', funnel?.luotXemChiTiet ?? 0],
      ['Lượt xem Tour 360°', funnel?.luotXemTour360 ?? 0],
      ['Lượt lưu yêu thích', funnel?.luotYeuThich ?? 0],
      ['Lịch đặt có cọc', funnel?.soLichDatCoc ?? 0],
      ['Lịch đã gặp xem thực tế', funnel?.soLichDaXem ?? 0],
      ['Lịch chốt thuê hoàn tất', funnel?.soLichHoanThanh ?? 0],
      ['Lịch hủy / không thuê', funnel?.soLichHuy ?? 0],
      ['Khách từ chối sau xem', funnel?.soLichKhachTuChoi ?? 0],
      ['Chủ trọ từ chối', funnel?.soLichChuTroTuChoi ?? 0],
      ['Ca khách vắng mặt (No-show)', funnel?.soCaNoShow ?? 0],
      [],
      ['III. DOANH THU HOA HỒNG THEO MỐC THỜI GIAN', 'Doanh thu hoa hồng (VNĐ)', 'Lịch đặt', 'Lịch hoàn tất'],
      ...stats.bieuDoDoanhThu.map((point) => [
        point.nhan,
        point.doanhThu,
        point.soLichDat ?? 0,
        point.soLichHoanThanh,
      ]),
      [],
      ['IV. MA TRẬN CUNG - CẦU - HOA HỒNG THEO LOẠI PHÒNG', 'Tổng phòng', 'Đang mở', 'Lượt xem', 'Lịch đặt', 'Hoàn tất', 'Hoa hồng (VNĐ)', 'Tỷ lệ chốt (%)'],
      ...stats.coCauLoaiPhong.map((item) => [
        item.tenLoaiPhong,
        item.soLuong,
        item.soPhongDangHienThi ?? 0,
        item.luotXem ?? 0,
        item.soLichDat ?? 0,
        item.soLichHoanThanh ?? 0,
        item.doanhThuHoaHong ?? 0,
        item.tyLeChot ?? 0,
      ]),
    ];

    if (ai) {
      rows.push(
        [],
        ['V. HIỆU SUẤT & CHI PHÍ AI', 'Giá trị'],
        ['Lượt gọi Gemini Provider', ai.tongLuotGoiProvider],
        ['Lượt Bypass cục bộ', ai.tongLuotBypass],
        ['Tỷ lệ tiết kiệm Bypass (%)', ai.tyLeTietKiemBypassPercent],
        ['Tổng Token', ai.tongToken],
        ['Chi phí AI ước tính (VNĐ)', ai.chiPhiUocTinhVnd],
        ['Biên lợi nhuận sau chi phí AI (VNĐ)', ai.bienLoiNhuanSauAiVnd],
        ['Độ phủ Vector (%)', ai.vectorCoveragePercent],
      );
    }

    if (aiInsight) {
      rows.push(
        [],
        ['VI. ĐÁNH GIÁ & ĐỀ XUẤT QUYẾT ĐỊNH', 'Nội dung'],
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
        soLichHoanThanh: point.soLichHoanThanh,
        soLichDat: point.soLichDat ?? 0,
      })),
    [stats?.bieuDoDoanhThu],
  );

  const treasuryBreakdownData = useMemo(
    () => [
      { danhMuc: 'Doanh thu hoa hồng', soTien: stats?.tongDoanhThu ?? 0 },
      { danhMuc: 'Cọc tạm giữ', soTien: stats?.quyTamGiuCoc ?? 0 },
      { danhMuc: 'Ví chủ trọ', soTien: stats?.tongSoDuViChuTro ?? 0 },
      { danhMuc: 'Quỹ chờ rút', soTien: stats?.quyChoRut ?? 0 },
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

  const funnelSteps = useMemo(() => {
    const f = stats?.pheuChuyenDoi;
    if (!f) return [];
    const discovery = f.luotHienThiGoiY + f.luotTimKiemAi;
    const views = f.luotXemChiTiet + f.luotXemTour360;
    return [
      { label: 'Hiển thị gợi ý & Tìm AI', count: discovery, sub: `${f.luotHienThiGoiY} gợi ý · ${f.luotTimKiemAi} AI search` },
      { label: 'Xem phòng & Tour 360°', count: views, sub: `${f.luotXemChiTiet} chi tiết · ${f.luotXemTour360} tour 360°` },
      { label: 'Lưu yêu thích', count: f.luotYeuThich, sub: 'Tổng lượt quan tâm lưu tin' },
      { label: 'Đặt lịch nộp cọc', count: f.soLichDatCoc, sub: 'Khách đã tạo lịch giữ chân' },
      { label: 'Đã gặp xem thực tế', count: f.soLichDaXem, sub: 'Xác nhận đã nhận lại cọc / xem' },
      { label: 'Chốt thuê (Thu phí sàn)', count: f.soLichHoanThanh, sub: `${f.tyLeChotTuDatLichPercent}% từ lịch đặt` },
    ];
  }, [stats?.pheuChuyenDoi]);

  const funnelMax = useMemo(
    () => Math.max(1, ...funnelSteps.map((s) => s.count)),
    [funnelSteps],
  );

  if (isLoading && !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-slate-200/70 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
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
        <AdminErrorState
          title="Không thể tải dữ liệu thống kê"
          message={errMsg}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  const aiInsight = currentInsight;
  const cmp = stats?.soSanhKyTruoc;
  const funnel = stats?.pheuChuyenDoi;
  const aiStats = stats?.tongQuanAiTracking;

  return (
    <div className="space-y-5">
      {/* Compact Filter Toolbar + Export */}
      <div className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
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

          <button
            type="button"
            onClick={handleExportReport}
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Strategic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl bg-white border border-teal-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Doanh thu hoa hồng</span>
              {cmp?.coSoSanh && cmp.phanTramBienDongDoanhThu !== null && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    cmp.phanTramBienDongDoanhThu >= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {cmp.phanTramBienDongDoanhThu >= 0 ? '+' : ''}
                  {cmp.phanTramBienDongDoanhThu}%
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-teal-700 tracking-tight tabular-nums">
              {formatVND(stats?.tongDoanhThu ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              {(stats?.soLichHoanThanh ?? 0).toLocaleString('vi-VN')} lịch chốt · Sau AI:{' '}
              <strong className="text-slate-700">
                {formatVND(aiStats?.bienLoiNhuanSauAiVnd ?? stats?.tongDoanhThu ?? 0)}
              </strong>
            </div>
          </Card.Content>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Tỷ lệ chốt từ đặt lịch</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                {funnel?.soLichDatCoc ?? 0} lịch cọc
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {(funnel?.tyLeChotTuDatLichPercent ?? 0).toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500">
              Xem thực tế: {funnel?.soLichDaXem ?? 0} · Hủy: {funnel?.soLichHuy ?? 0} · No-show:{' '}
              {funnel?.soCaNoShow ?? 0}
            </div>
          </Card.Content>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Tổng két thực tế</span>
              {(stats?.soLenhRutChoDuyet ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                  {stats?.soLenhRutChoDuyet} chờ rút
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              {formatVND(stats?.tongQuyThucTe ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              Quỹ giữ hộ: {formatVND(stats?.tongQuyHeThong ?? 0)} (Cọc + Ví chủ trọ)
            </div>
          </Card.Content>
        </Card>

        <Card className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Card.Content className="p-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">Hiệu quả Gợi ý & Vector</span>
              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
                Vector {aiStats?.vectorCoveragePercent ?? 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">
              CTR {(funnel?.ctrGoiYPercent ?? 0).toFixed(1)}%
            </div>
            <div className="text-[11px] text-slate-500">
              {funnel?.luotXemChiTiet ?? 0} lượt xem phòng · {funnel?.luotXemTour360 ?? 0} Tour 360° ·{' '}
              {stats?.tongSoPhong ?? 0} phòng
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 w-fit">
        {[
          { id: 'overview' as const, label: 'Doanh thu & Cung-Cầu', Icon: BarChart3 },
          { id: 'funnel' as const, label: 'Phễu chuyển đổi', Icon: Filter },
          { id: 'ai' as const, label: 'Hiệu suất AI & Nhu cầu', Icon: Cpu },
        ].map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <PlatformRevenueChart
            data={revenueChartData}
            title="Biểu đồ Doanh thu Hoa hồng & Lưu lượng Lịch hẹn"
            subtitle={`Đối chiếu phí hoa hồng (VNĐ) với số lịch đặt và lịch chốt thuê (${activePeriodLabel})`}
            isLoading={isLoading && !stats}
            isError={isError}
            onRetry={() => void refetch()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <Card.Header className="p-0 pb-4">
                <Card.Title className="text-sm font-bold text-slate-900">
                  Cơ cấu ngân khố & quỹ hệ thống
                </Card.Title>
                <Card.Description className="text-xs text-slate-500 mt-0.5">
                  Phân bổ doanh thu hoa hồng, cọc tạm giữ, ví chủ trọ và quỹ chờ rút
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
                      <XAxis dataKey="danhMuc" stroke="#64748b" fontSize={10} tickLine={false} />
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
                      <Bar dataKey="soTien" fill="#0d9488" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card.Content>
            </Card>

            <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
              <Card.Header className="p-0 pb-4 flex flex-row items-start justify-between gap-3">
                <div>
                  <Card.Title className="text-sm font-bold text-slate-900">
                    Ma trận Cung – Cầu – Hoa hồng theo Loại phòng
                  </Card.Title>
                  <Card.Description className="text-xs text-slate-500 mt-0.5">
                    Phát hiện loại phòng thiếu nguồn cung hoặc mang lại hoa hồng cao nhất
                  </Card.Description>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRoomMixView('matrix')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      roomMixView === 'matrix' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Bảng ma trận
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoomMixView('pie')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      roomMixView === 'pie' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Biểu đồ tròn
                  </button>
                </div>
              </Card.Header>

              <Card.Content className="p-0 flex-1">
                {roomMixView === 'pie' ? (
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
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] text-slate-500 border-y border-slate-100">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Loại phòng</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Đang mở / Tổng</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Lượt xem</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Lịch đặt / Chốt</th>
                          <th className="py-2.5 px-2 text-right font-semibold">Tỷ lệ chốt</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Hoa hồng sàn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(stats?.coCauLoaiPhong ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              Chưa có dữ liệu trong kỳ lọc này.
                            </td>
                          </tr>
                        ) : (
                          (stats?.coCauLoaiPhong ?? []).map((item) => (
                            <tr key={item.tenLoaiPhong} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {item.tenLoaiPhong}
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                                {item.soPhongDangHienThi ?? 0} / {item.soLuong}
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                                {(item.luotXem ?? 0).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                                {item.soLichDat ?? 0} / <strong className="text-slate-900">{item.soLichHoanThanh ?? 0}</strong>
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-nums">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    (item.tyLeChot ?? 0) >= 50
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : (item.tyLeChot ?? 0) > 0
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {(item.tyLeChot ?? 0).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-teal-700 tabular-nums">
                                {formatVND(item.doanhThuHoaHong ?? 0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-sm font-bold text-slate-900">
                Phễu Chuyển đổi Toàn Sàn (Tracking ➔ Chốt thuê)
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                Đo lường tỷ lệ chuyển đổi qua 6 bước từ khám phá tới thu hoa hồng ({activePeriodLabel})
              </Card.Description>
            </Card.Header>
            <Card.Content className="p-0 space-y-3.5">
              {funnelSteps.map((step, index) => {
                const widthPct = Math.max(8, Math.round((step.count * 100) / funnelMax));
                const prevCount = index > 0 ? funnelSteps[index - 1].count : 0;
                const stepConv =
                  index > 0 && prevCount > 0
                    ? `${Math.min(100, (step.count * 100) / prevCount).toFixed(1)}%`
                    : null;
                return (
                  <div key={step.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="font-semibold text-slate-800">
                        {index + 1}. {step.label}
                      </div>
                      <div className="flex items-center gap-2">
                        {stepConv && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            Chuyển đổi bước: {stepConv}
                          </span>
                        )}
                        <span className="font-black text-slate-900 tabular-nums">
                          {step.count.toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-500 transition-all duration-300"
                        style={{ width: `${step.count === 0 ? 0 : widthPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">{step.sub}</p>
                  </div>
                );
              })}
            </Card.Content>
          </Card>

          <Card className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <Card.Header className="p-0 pb-4">
                <Card.Title className="text-sm font-bold text-slate-900">
                  Phân rã Lý do Rớt Lịch & Hủy Hẹn
                </Card.Title>
                <Card.Description className="text-xs text-slate-500 mt-0.5">
                  Xác định điểm nghẽn khiến giao dịch chưa phát sinh hoa hồng
                </Card.Description>
              </Card.Header>
              <Card.Content className="p-0 space-y-3">
                {[
                  {
                    label: 'Khách từ chối thuê sau xem',
                    value: funnel?.soLichKhachTuChoi ?? 0,
                    tone: 'bg-rose-50 text-rose-700 border-rose-200',
                    hint: 'Cần kiểm tra lại chất lượng ảnh thực tế vs mô tả phòng',
                  },
                  {
                    label: 'Chủ trọ từ chối cho thuê',
                    value: funnel?.soLichChuTroTuChoi ?? 0,
                    tone: 'bg-amber-50 text-amber-700 border-amber-200',
                    hint: 'Kiểm tra tình trạng phòng đã thuê nhưng chưa ẩn tin',
                  },
                  {
                    label: 'Khách vắng mặt (No-show)',
                    value: funnel?.soCaNoShow ?? 0,
                    tone: 'bg-slate-100 text-slate-700 border-slate-200',
                    hint: 'Đã xử lý bồi thường cọc giữ chân cho chủ trọ',
                  },
                  {
                    label: 'Tổng lịch hủy / không thành',
                    value: funnel?.soLichHuy ?? 0,
                    tone: 'bg-slate-50 text-slate-800 border-slate-200',
                    hint: `Tỷ lệ chốt sau khi gặp mặt thực tế: ${(funnel?.tyLeChotTuXemThucTePercent ?? 0).toFixed(1)}%`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${item.tone}`}
                  >
                    <div>
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{item.hint}</div>
                    </div>
                    <div className="text-xl font-black tabular-nums shrink-0">{item.value}</div>
                  </div>
                ))}
              </Card.Content>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <Link
                to="/admin/viewings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
              >
                <span>Giám sát chi tiết lịch hẹn</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Chi phí AI & Hiệu quả Kinh tế (30 ngày gần nhất)</span>
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                Đo lường chi phí gọi Gemini API so với Doanh thu hoa hồng sàn
              </Card.Description>
            </Card.Header>
            <Card.Content className="p-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] text-slate-500 font-medium">Chi phí token AI ước tính</div>
                  <div className="text-lg font-black text-slate-900 mt-1 tabular-nums">
                    {aiStats?.pricingConfigured ? formatVND(aiStats.chiPhiUocTinhVnd) : 'Chưa cấu hình giá'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {(aiStats?.tongToken ?? 0).toLocaleString('vi-VN')} tokens ·{' '}
                    {aiStats?.tongLuotGoiProvider ?? 0} provider calls
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80">
                  <div className="text-[11px] text-teal-700 font-medium">Biên lợi nhuận sau AI</div>
                  <div className="text-lg font-black text-teal-800 mt-1 tabular-nums">
                    {formatVND(aiStats?.bienLoiNhuanSauAiVnd ?? stats?.tongDoanhThu ?? 0)}
                  </div>
                  <div className="text-[11px] text-teal-700 mt-0.5">
                    Chi phí AI / Doanh thu: {(aiStats?.tyLeChiPhiAiTrenDoanhThuPercent ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Quota Token trong ngày</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {(aiStats?.dailyTokensUsed ?? 0).toLocaleString('vi-VN')} /{' '}
                    {(aiStats?.dailyTokenLimit ?? 0).toLocaleString('vi-VN')} ({aiStats?.quotaUsagePercent ?? 0}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      aiStats?.quotaWarning ? 'bg-amber-500' : 'bg-teal-600'
                    }`}
                    style={{ width: `${Math.min(100, aiStats?.quotaUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">Local Bypass</div>
                  <div className="text-sm font-black text-emerald-700">
                    {aiStats?.tyLeTietKiemBypassPercent ?? 0}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">Thành công API</div>
                  <div className="text-sm font-black text-slate-900">
                    {aiStats?.tyLeThanhCongPercent ?? 100}%
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="text-[11px] text-slate-500">Độ phủ Vector</div>
                  <div className="text-sm font-black text-teal-700">
                    {aiStats?.indexedRooms ?? 0}/{aiStats?.totalApprovedRooms ?? 0}
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <Card.Header className="p-0 pb-4">
              <Card.Title className="text-sm font-bold text-slate-900">
                Xu hướng Nhu cầu Tìm kiếm (Search Intents)
              </Card.Title>
              <Card.Description className="text-xs text-slate-500 mt-0.5">
                Phân loại ý định từ Chatbot & AI Search ({aiStats?.semanticSearchCount ?? 0} Semantic ·{' '}
                {aiStats?.filteredFallbackCount ?? 0} Filtered)
              </Card.Description>
            </Card.Header>
            <Card.Content className="p-0 space-y-3">
              {(aiStats?.topIntents ?? []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Chưa ghi nhận intent tìm kiếm AI trong kỳ này.
                </div>
              ) : (
                (aiStats?.topIntents ?? []).map((item) => {
                  const maxIntent = Math.max(1, ...(aiStats?.topIntents ?? []).map((i) => i.count));
                  const pct = Math.max(8, Math.round((item.count * 100) / maxIntent));
                  return (
                    <div key={item.intent} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.intent}</span>
                        <span className="font-bold text-slate-900 tabular-nums">{item.count} lượt</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Chart Evaluation & Decision Recommendations */}
      <Card className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <Card.Header className="p-0 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Card.Title className="text-sm font-bold text-slate-900">
              Nhận định & Đề xuất Quyết định
            </Card.Title>
            <Card.Description className="text-xs text-slate-500 mt-0.5">
              Tổng hợp theo kỳ lọc ({activePeriodLabel}) kết hợp dữ liệu Tracking & Phễu
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
            {insightMutation.isPending && (
              <p role="status" className="text-xs text-teal-700">
                Đang tổng hợp nhận định. Bạn có thể tiếp tục xem các số liệu bên trên.
              </p>
            )}
            {insightMutation.isError && (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                {insightMutation.error.message}
                {aiInsight ? ' Kết quả lần trước vẫn được giữ bên dưới.' : ''}
              </p>
            )}

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

            {aiInsight && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/80 to-blue-50/70 border border-teal-200/70 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Nhận định tổng hợp</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-teal-200 text-[10px] font-bold text-teal-700">
                      {aiInsight.nguonPhanTich === 'AI' ? 'Phân tích AI Gemini' : 'Phân tích tự động'}
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
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-teal-700">
                    Xem thêm nhận định chi tiết
                  </summary>
                  <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
                </details>
              </div>
            )}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};
